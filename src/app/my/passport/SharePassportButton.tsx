"use client";

import { useState } from "react";

import { t } from "~/i18n/fi";

const copy = t.pages.my.passport;

export function SharePassportButton() {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function share() {
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/my/passport/share.png");
      if (!response.ok) throw new Error(String(response.status));
      const file = new File([await response.blob()], "museopassi.png", {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: copy.shareTitle });
      } else {
        const url = URL.createObjectURL(file);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name;
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <p role="status" className="text-signal font-sans text-sm">
        {failed ? copy.shareFailed : ""}
      </p>
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className="btn btn-secondary"
      >
        {copy.share}
      </button>
    </div>
  );
}
