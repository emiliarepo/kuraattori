"use client";

import { useEffect, useRef, useState } from "react";

import { t } from "~/i18n/fi";

const copy = t.pages.my.passport;
const COPIED_MS = 2500;

async function loadImage() {
  const response = await fetch("/my/passport/share.png");
  if (!response.ok) throw new Error(String(response.status));
  return new File([await response.blob()], "museopassi.png", {
    type: "image/png",
  });
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Safari only lets `navigator.share` run inside the tap's user activation,
 * so the image is fetched on mount rather than after the click.
 */
export function SharePassportButton({
  text,
  url,
}: {
  text: string;
  url: string;
}) {
  const image = useRef<Promise<File | null>>(null);
  const [busy, setBusy] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [message, setMessage] = useState<"copied" | "failed" | null>(null);

  useEffect(() => {
    image.current = loadImage().catch(() => null);
  }, []);

  useEffect(() => {
    if (message !== "copied") return;
    const timer = setTimeout(() => setMessage(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [message]);

  async function awaitImage() {
    setPreparing(true);
    try {
      return await image.current;
    } finally {
      setPreparing(false);
    }
  }

  async function share() {
    setBusy(true);
    setMessage(null);
    try {
      if (typeof navigator.share === "function") {
        const file = await awaitImage();
        const withImage = file ? { files: [file], text, url } : null;
        await navigator.share(
          withImage && navigator.canShare?.(withImage)
            ? withImage
            : { text, url },
        );
      } else {
        const copied = navigator.clipboard.writeText(`${text}\n${url}`);
        const file = await awaitImage();
        await copied;
        if (file) download(file);
        setMessage("copied");
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage("failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center">
      <p role="status" className="font-sans text-sm">
        {message && (
          <span className={`mr-3 ${message === "failed" ? "text-signal" : ""}`}>
            {message === "copied" ? copy.shareCopied : copy.shareFailed}
          </span>
        )}
      </p>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="btn btn-secondary"
      >
        <span className="grid justify-items-center">
          <span className="[grid-area:1/1]">
            {preparing ? copy.sharePreparing : copy.share}
          </span>
          <span aria-hidden className="invisible [grid-area:1/1]">
            {copy.sharePreparing}
          </span>
        </span>
      </button>
    </div>
  );
}
