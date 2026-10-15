'use client';

import { UserRole, type WorkDetail } from '@ncanny/types';
import { Alert, Button, FormField, Input, Textarea } from '@ncanny/ui';
import { reviewWorkSchema, reportWorkSchema } from '@ncanny/validation';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { MarkStars, Portrait } from '../neon';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../lib/form';

export function WorkReader({ work, onClose }: { work: WorkDetail; onClose?: () => void }) {
  const viewer = useAuthStore((state) => state.user);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [current, setCurrent] = useState(work);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [reported, setReported] = useState(false);

  useEffect(() => {
    setCurrent(work);
  }, [work]);

  useEffect(() => {
    if (!current.hasMedia) return undefined;
    const controller = new AbortController();
    let url: string | null = null;
    getApiClient()
      .content.media(current.id, { signal: controller.signal })
      .then((payload) => {
        const bytes = Uint8Array.from(atob(payload.dataBase64), (char) => char.charCodeAt(0));
        url = URL.createObjectURL(new Blob([bytes], { type: payload.mimeType }));
        setMediaUrl(url);
      })
      .catch(() => setMediaUrl(null));
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [current.hasMedia, current.id]);

  const canReview = viewer?.role === UserRole.PRECEPTOR && !current.ownedByViewer;

  const submitReview = async (form: FormData) => {
    const parsed = parseForm(reviewWorkSchema, {
      score: form.get('score'),
      feedback: form.get('feedback'),
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    try {
      setCurrent(await getApiClient().content.review(current.id, parsed.data));
      setErrors({});
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  const submitReport = async (form: FormData) => {
    const parsed = parseForm(reportWorkSchema, { reason: form.get('reason') });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    try {
      await getApiClient().content.report(current.id, parsed.data);
      setReported(true);
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  const heading =
    current.type === 'ELOCUTION' ? 'Elocution' : current.type === 'ESSAY' ? 'Essay Writing' : current.type.replaceAll('_', ' ');

  return (
    <article className="hud-frame flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <h2 className="neon-title text-lg sm:text-2xl">{heading}</h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[11rem_1fr]">
        <aside className="flex flex-col items-center text-center">
          <Portrait name={current.authorName} size="md" />
          <p className="mt-2 font-semibold text-content">{current.authorName}</p>
          <p className="font-mono text-xs text-content-muted">{current.authorCannyId}</p>
          <p className="mt-1 text-xs text-content-muted">{current.subjectName}</p>
          <div className="mt-2">
            <MarkStars score={current.review?.score} />
          </div>
        </aside>
        <div className="flex flex-col gap-3">
          <h3 className="font-display text-3xl font-semibold text-content">{current.title}</h3>

      {mediaUrl && current.mediaKind === 'IMAGE' && (
        // The bytes were fetched with the viewer's token; a plain img URL would skip that check.
        <div className="stage">
          <p className="kicker">Studio</p>
          <img src={mediaUrl} alt={current.title} className="mt-3 max-h-96 w-full rounded-lg object-contain" />
        </div>
      )}
      {mediaUrl && current.mediaKind === 'AUDIO' && (
        <div className="stage">
          <p className="kicker">Play</p>
          <audio controls src={mediaUrl} className="mt-3 w-full" />
        </div>
      )}

      {current.body && <div className="reading-well whitespace-pre-wrap text-content">{current.body}</div>}
      {current.summary && !current.body && <p className="text-sm text-content">{current.summary}</p>}

      {current.review && (
        <Alert tone="info" title={`Feedback from ${current.review.reviewerName}`}>
          {current.review.feedback}
        </Alert>
      )}

      {errors[FORM_ERROR] && <Alert tone="danger">{errors[FORM_ERROR]}</Alert>}

      {canReview && (
        <form
          className="flex flex-col gap-3 border-t border-border pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void submitReview(new FormData(event.currentTarget));
          }}
        >
          <FormField label="Mark out of 100" error={errors.score}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                name="score"
                type="number"
                min={0}
                max={100}
                aria-describedby={describedBy}
                invalid={invalid}
              />
            )}
          </FormField>
          <FormField label="Feedback" error={errors.feedback}>
            {({ id, describedBy, invalid }) => (
              <Textarea id={id} name="feedback" aria-describedby={describedBy} invalid={invalid} />
            )}
          </FormField>
          <Button type="submit">Save mark</Button>
        </form>
      )}

      {!current.ownedByViewer && !reported && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void submitReport(new FormData(event.currentTarget));
          }}
        >
          <FormField label="Report this work" hint="A Preceptor will see the flag." error={errors.reason}>
            {({ id, describedBy, invalid }) => (
              <Input id={id} name="reason" aria-describedby={describedBy} invalid={invalid} />
            )}
          </FormField>
          <Button type="submit" variant="ghost" size="sm">
            Report
          </Button>
        </form>
      )}
      {reported && <Alert tone="success">Reported. Thank you for flagging it.</Alert>}
        </div>
      </div>
    </article>
  );
}
