'use client';

import { UserRole, type WorkDetail } from '@ncanny/types';
import { Alert, Button, FormField, Input, Textarea } from '@ncanny/ui';
import { commentWorkSchema, reportWorkSchema, reviewWorkSchema } from '@ncanny/validation';
import { useEffect, useState } from 'react';
import { getApiClient } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import { MarkStars, Portrait } from '../neon';
import { EngagementBar } from './EngagementBar';
import { ElocutionStage } from './ElocutionStage';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../../lib/form';

export function WorkReader({ work, onClose }: { work: WorkDetail; onClose?: () => void }) {
  const viewer = useAuthStore((state) => state.user);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [current, setCurrent] = useState(work);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [reported, setReported] = useState(false);
  const [comment, setComment] = useState('');
  const [reportingComment, setReportingComment] = useState<string | null>(null);

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

  const submitComment = async () => {
    const parsed = parseForm(commentWorkSchema, { body: comment });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    try {
      setCurrent(await getApiClient().content.comment(current.id, parsed.data));
      setComment('');
      setErrors({});
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  const heading =
    current.type === 'ELOCUTION' ? 'Elocution' : current.type === 'ESSAY' ? 'Essay Writing' : current.type.replaceAll('_', ' ');
  const posted = new Date(current.createdAt).toLocaleDateString();

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
          <p className="mt-1 text-xs text-content-muted">{posted}</p>
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
      {mediaUrl && current.mediaKind === 'AUDIO' && <ElocutionStage src={mediaUrl} title={current.title} />}

      {current.body && <div className="reading-well whitespace-pre-wrap text-content">{current.body}</div>}
      {current.summary && !current.body && <p className="text-sm text-content">{current.summary}</p>}

      <EngagementBar
        work={current}
        ownedByViewer={current.ownedByViewer}
        onUpdated={(detail) => setCurrent(detail)}
      />

      {current.review && (
        <Alert tone="info" title={`Feedback from ${current.review.reviewerName}`}>
          {current.review.feedback}
        </Alert>
      )}

      <section id="comments" className="flex flex-col gap-3 border-t border-border pt-3">
        <h4 className="font-display text-lg text-content">Comments</h4>
        {current.comments.length === 0 ? (
          <p className="text-sm text-content-muted">No comments yet. Notes stay on this work. They are not private messages.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {current.comments.map((note) => (
              <li key={note.id} className="rounded-xl border border-primary/40 bg-surface-sunken px-3 py-2">
                <p className="text-sm font-semibold text-content">
                  {note.authorName}{' '}
                  <span className="font-mono text-xs font-normal text-content-muted">{note.authorCannyId}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-content">{note.body}</p>
                {note.authorCannyId !== viewer?.cannyId && reportingComment !== note.id && (
                  <button
                    type="button"
                    className="mt-1 text-xs text-content-muted underline"
                    onClick={() => setReportingComment(note.id)}
                  >
                    Report comment
                  </button>
                )}
                {reportingComment === note.id && (
                  <form
                    className="mt-2 flex flex-col gap-2"
                    onSubmit={(event) => {
                      event.preventDefault();
                      const reason = String(new FormData(event.currentTarget).get('commentReason') ?? '');
                      const parsed = parseForm(reportWorkSchema, { reason });
                      if (!parsed.ok) {
                        setErrors(parsed.errors);
                        return;
                      }
                      void getApiClient()
                        .content.reportComment(current.id, note.id, parsed.data)
                        .then(() => {
                          setReported(true);
                          setReportingComment(null);
                        })
                        .catch((error) => setErrors(toFormErrors(error)));
                    }}
                  >
                    <Input name="commentReason" aria-label="Why are you reporting this comment?" />
                    <Button type="submit" size="sm" variant="ghost">
                      Send report
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        <FormField label="Add a comment" error={errors.body}>
          {({ id, describedBy, invalid }) => (
            <Textarea
              id={id}
              name="comment"
              value={comment}
              maxLength={500}
              aria-describedby={describedBy}
              invalid={invalid}
              onChange={(event) => setComment(event.target.value)}
            />
          )}
        </FormField>
        <Button type="button" variant="accent" onClick={() => void submitComment()}>
          Comment
        </Button>
      </section>

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
