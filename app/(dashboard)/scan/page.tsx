"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { ScanLine, CameraOff, ArrowRight } from "lucide-react";

import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Resolve scanned text (a full scan URL or a bare token) to a local path. */
function resolveTarget(text: string): string | null {
  const t = text.trim();
  if (!t) return null;
  try {
    const url = new URL(t);
    const m = url.pathname.match(/\/scan\/([^/]+)/);
    if (m) return `/scan/${m[1]}`;
  } catch {
    /* not a URL */
  }
  return `/scan/${encodeURIComponent(t)}`;
}

export default function ScanPage() {
  const router = useRouter();
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsRef = React.useRef<IScannerControls | null>(null);
  const navigatedRef = React.useRef(false);
  const [cameraError, setCameraError] = React.useState(false);
  const [manual, setManual] = React.useState("");

  React.useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let active = true;

    function handle(text: string) {
      if (navigatedRef.current) return;
      const target = resolveTarget(text);
      if (!target) return;
      navigatedRef.current = true;
      controlsRef.current?.stop();
      router.push(target);
    }

    reader
      .decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result, _err, controls) => {
          if (!active) {
            controls.stop();
            return;
          }
          if (result) handle(result.getText());
        },
      )
      .then((controls) => {
        controlsRef.current = controls;
        if (!active) controls.stop();
      })
      .catch(() => setCameraError(true));

    return () => {
      active = false;
      controlsRef.current?.stop();
    };
  }, [router]);

  function submitManual(e: React.FormEvent) {
    e.preventDefault();
    const target = resolveTarget(manual);
    if (target) router.push(target);
  }

  return (
    <PageContainer>
      <div className="mx-auto max-w-md space-y-6">
        <PageHeader
          title="Scan"
          subtitle="Point your camera at an asset's QR code."
        />

        <Card>
          <CardContent className="p-5 sm:p-6">
            {cameraError ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-white/6 dark:text-gray-400">
                  <CameraOff className="size-6" />
                </span>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    Camera unavailable
                  </p>
                  <p className="text-sm text-text-tertiary">
                    Allow camera access, or enter a code manually below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative aspect-square overflow-hidden rounded-xl bg-gray-950">
                <video
                  ref={videoRef}
                  className="size-full object-cover"
                  muted
                  playsInline
                />
                {/* viewfinder */}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="size-48 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
                </div>
                <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 text-xs text-white/90">
                  <ScanLine className="size-3.5" />
                  Scanning…
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={submitManual} className="space-y-2">
              <Label htmlFor="manual-code">Enter a code or link</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-code"
                  value={manual}
                  onChange={(e) => setManual(e.target.value)}
                  placeholder="Paste QR link or token"
                />
                <Button type="submit" disabled={!manual.trim()}>
                  Go
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
