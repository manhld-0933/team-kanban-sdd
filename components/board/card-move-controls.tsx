"use client";

import { useLocale } from "@/components/i18n/locale-provider";

export function CardMoveControls({
  columnIndex,
  columnCount,
  disabled,
  onMoveUp,
  onMoveDown,
  onMoveLeft,
  onMoveRight,
}: {
  columnIndex: number;
  columnCount: number;
  disabled: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="card-move-controls" aria-label={t("cardMoveControls")}>
      <button type="button" aria-label={t("cardMoveUp")} title={t("cardMoveUp")} onClick={onMoveUp} disabled={disabled}>↑</button>
      <button type="button" aria-label={t("cardMoveDown")} title={t("cardMoveDown")} onClick={onMoveDown} disabled={disabled}>↓</button>
      <button type="button" aria-label={t("cardMoveLeft")} title={t("cardMoveLeft")} onClick={onMoveLeft} disabled={disabled || columnIndex === 0}>←</button>
      <button type="button" aria-label={t("cardMoveRight")} title={t("cardMoveRight")} onClick={onMoveRight} disabled={disabled || columnIndex === columnCount - 1}>→</button>
    </div>
  );
}
