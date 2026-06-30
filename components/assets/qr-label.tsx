"use client";

import { Printer, QrCode, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssetQr } from "@/lib/api/hooks";

function printLabel(dataUrl: string, assetTag: string, name: string) {
  const win = window.open("", "_blank", "width=420,height=560");
  if (!win) return;
  win.document.write(`<!doctype html><html><head><title>${assetTag}</title>
    <style>
      *{margin:0;box-sizing:border-box;font-family:ui-sans-serif,system-ui,sans-serif}
      body{display:flex;align-items:center;justify-content:center;min-height:100vh}
      .label{width:280px;border:1px solid #d0d5dd;border-radius:12px;padding:20px;text-align:center}
      .label img{width:200px;height:200px}
      .tag{font-size:18px;font-weight:700;margin-top:12px;letter-spacing:.02em}
      .name{font-size:13px;color:#475467;margin-top:2px}
    </style></head>
    <body><div class="label"><img src="${dataUrl}" alt="QR"/><div class="tag">${assetTag}</div><div class="name">${name}</div></div>
    <script>window.onload=function(){window.focus();window.print();}</script>
    </body></html>`);
  win.document.close();
}

export function QrLabel({
  assetId,
  assetTag,
  assetName,
}: {
  assetId: string;
  assetTag: string;
  assetName: string;
}) {
  const { data: dataUrl, isLoading, isError, refetch, isFetching } =
    useAssetQr(assetId);

  return (
    <div className="space-y-4">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-white p-3">
        {isLoading ? (
          <Skeleton className="size-full" />
        ) : isError || !dataUrl ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <QrCode className="size-12 text-gray-300" strokeWidth={1.5} />
            <p className="text-xs text-text-tertiary">Couldn’t load QR</p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dataUrl}
            alt={`QR code for ${assetTag}`}
            className="size-full object-contain"
          />
        )}
      </div>

      {isError ? (
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RotateCw className="size-4" />
          Retry
        </Button>
      ) : (
        <Button
          variant="secondary"
          className="w-full"
          disabled={!dataUrl}
          onClick={() => dataUrl && printLabel(dataUrl, assetTag, assetName)}
        >
          <Printer className="size-4" />
          Print label
        </Button>
      )}
    </div>
  );
}
