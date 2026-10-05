import { useTexts } from '@src/lib/lang';

const apiBaseURL = process.env.BASE_URL!;

const TEXTS = {
  uk: { alt: 'Кадр камери з межами полум’я', open: 'Відкрити кадр повністю' },
  en: { alt: 'Camera frame with the flame outlined', open: 'Open the whole frame' },
};

/**
 * The frame a camera raised its flame alarm on, with the flame's box, under an alert; opens full size.
 */
export function IncidentImage({ id }: { id: number }) {
  const t = useTexts(TEXTS);
  const src = `${apiBaseURL}/incidents/${id}/image`;
  return (
    <a href={src} target="_blank" rel="noreferrer" title={t.open} className="mt-1.5 block w-fit">
      <img
        src={src}
        alt={t.alt}
        loading="lazy"
        className="max-h-40 w-auto max-w-full rounded-md border border-black/10 bg-black"
      />
    </a>
  );
}
