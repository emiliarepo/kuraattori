"use client";

import { useEffect, useState } from "react";

import { useI18n } from "~/i18n/client";
import { VAPID_PUBLIC_KEY } from "~/push/vapid";
import { api } from "~/trpc/react";

type State =
  | "checking"
  | "unsupported"
  | "denied"
  | "off"
  | "enabling"
  | "on"
  | "disabling";

function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

// Only production registers the service worker; elsewhere `ready` never resolves.
async function getRegistration() {
  if (process.env.NODE_ENV !== "production") return undefined;
  return navigator.serviceWorker.ready;
}

function base64UrlToBytes(value: string) {
  const base64 = (value + "=".repeat((4 - (value.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

export function PushToggle() {
  const { t } = useI18n();
  const [state, setState] = useState<State>("checking");
  const [failed, setFailed] = useState(false);
  const subscribe = api.push.subscribe.useMutation();
  const unsubscribe = api.push.unsubscribe.useMutation();

  useEffect(() => {
    if (!isPushSupported()) return setState("unsupported");
    if (Notification.permission === "denied") return setState("denied");
    void getRegistration().then(async (registration) => {
      if (!registration) return setState("unsupported");
      const subscription = await registration.pushManager.getSubscription();
      setState(subscription ? "on" : "off");
    });
  }, []);

  async function enable() {
    setFailed(false);
    setState("enabling");
    try {
      if ((await Notification.requestPermission()) !== "granted")
        return setState(
          Notification.permission === "denied" ? "denied" : "off",
        );
      const registration = await getRegistration();
      if (!registration) return setState("unsupported");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(VAPID_PUBLIC_KEY),
      });
      const { endpoint, keys } = subscription.toJSON();
      await subscribe.mutateAsync({
        endpoint: endpoint!,
        keys: { p256dh: keys!.p256dh!, auth: keys!.auth! },
      });
      setState("on");
    } catch {
      setFailed(true);
      setState("off");
    }
  }

  async function disable() {
    setState("disabling");
    const registration = await getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (subscription) {
      await unsubscribe.mutateAsync({ endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
    setState("off");
  }

  const isIos = /iPhone|iPad|iPod/.test(
    typeof navigator === "undefined" ? "" : navigator.userAgent,
  );

  return (
    <section
      aria-labelledby="push-heading"
      className="border-rule-soft flex flex-col gap-3 border-t pt-6"
    >
      <h2 id="push-heading" className="text-kicker">
        {t.profile.push.heading}
      </h2>
      <p className="text-muted text-sm">{t.profile.push.description}</p>
      <div aria-live="polite" className="flex flex-col gap-3 font-sans text-sm">
        {state === "unsupported" ? (
          <p>
            {isIos ? t.profile.push.unsupportedIos : t.profile.push.unsupported}
          </p>
        ) : state === "denied" ? (
          <p>{t.profile.push.denied}</p>
        ) : state === "on" || state === "disabling" ? (
          <>
            <p>{t.profile.push.enabled}</p>
            <button
              type="button"
              className="btn btn-secondary self-start"
              disabled={state === "disabling"}
              onClick={disable}
            >
              {state === "disabling"
                ? t.profile.push.disabling
                : t.profile.push.disable}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-secondary self-start"
              disabled={state !== "off"}
              onClick={enable}
            >
              {state === "enabling"
                ? t.profile.push.enabling
                : t.profile.push.enable}
            </button>
            {failed && <p>{t.profile.push.failed}</p>}
          </>
        )}
      </div>
    </section>
  );
}
