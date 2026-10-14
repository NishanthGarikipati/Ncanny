'use client';

import { UserRole, type WorkDetail } from '@ncanny/types';
import { Alert, Badge, Button, FormField, Input, Textarea } from '@ncanny/ui';
import { reviewWorkSchema, reportWorkSchema } from '@ncanny/validation';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
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

  return (
    <article className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-primary">{current.subjectName}</p>
          <h2 className="font-display text-xl font-semibold text-content">{current.title}</h2>
          <p className="text-sm text-content-muted">
            {current.authorName} · {current.authorCannyId}
          </p>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </header>

      <div className="flex flex-wrap gap-2">
        <Badge tone="primary">{current.type.replaceAll('_', ' ')}</Badge>
        {current.review && <Badge tone="success">Marked {current.review.score}/100</Badge>}
      </div>

      {mediaUrl && current.mediaKind === 'IMAGE' && (
        // The bytes were fetched with the viewer's token; a plain img URL would skip that check.
        <img src={mediaUrl} alt={current.title} className="max-h-80 w-full rounded-md object-contain" />
      )}
      {mediaUrl && current.mediaKind === 'AUDIO' && <audio controls src={mediaUrl} className="w-full" />}

      {current.body && <p className="whitespace-pre-wrap text-sm text-content">{current.body}</p>}
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
    </article>
  );
}
