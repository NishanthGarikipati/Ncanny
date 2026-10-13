import { UserRole, type WorkDetail } from '@ncanny/types';
import { reportWorkSchema, reviewWorkSchema } from '@ncanny/validation';
import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Banner, Button, Card, Muted, Screen, TextField } from '../components/ui';
import { getApiClient } from '../lib/api';
import { useAuthStore } from '../lib/auth-store';
import { FORM_ERROR, parseForm, toFormErrors, type FieldErrors } from '../lib/form';
import { useTheme } from '../theme/theme';

export function WorkScreen({ id }: { id: string }) {
  const colors = useTheme();
  const viewer = useAuthStore((state) => state.user);
  const [work, setWork] = useState<WorkDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reason, setReason] = useState('');
  const [reported, setReported] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    const controller = new AbortController();
    getApiClient()
      .content.byId(id, { signal: controller.signal })
      .then(setWork)
      .catch(() => {
        if (!controller.signal.aborted) setMissing(true);
      });
    return () => controller.abort();
  }, [id]);

  if (missing) {
    return (
      <Screen title="Work">
        <Banner tone="danger" message="This work is not available." />
      </Screen>
    );
  }

  if (!work) {
    return (
      <Screen title="Work">
        <Muted>Opening the work</Muted>
      </Screen>
    );
  }

  const canReview = viewer?.role === UserRole.PRECEPTOR && !work.ownedByViewer;

  const submitReview = async () => {
    const parsed = parseForm(reviewWorkSchema, { score, feedback });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    try {
      setWork(await getApiClient().content.review(work.id, parsed.data));
      setErrors({});
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  const submitReport = async () => {
    const parsed = parseForm(reportWorkSchema, { reason });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    try {
      await getApiClient().content.report(work.id, parsed.data);
      setReported(true);
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  return (
    <Screen title={work.title} subtitle={`${work.authorName} · ${work.authorCannyId}`}>
      {errors[FORM_ERROR] ? <Banner tone="danger" message={errors[FORM_ERROR]} /> : null}
      <Card>
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{work.subjectName}</Text>
        <Muted>{work.type.replaceAll('_', ' ')}</Muted>
        {work.body ? <Text style={{ color: colors.text, fontSize: 16 }}>{work.body}</Text> : null}
        {work.hasMedia ? (
          <Muted>This piece has a file. Open it on the web app to see or hear it.</Muted>
        ) : null}
        {work.review ? (
          <Banner
            tone="info"
            message={`Marked ${work.review.score}/100 by ${work.review.reviewerName}. ${work.review.feedback}`}
          />
        ) : null}
      </Card>
      {canReview ? (
        <Card>
          <TextField
            label="Mark out of 100"
            value={score}
            onChangeText={setScore}
            keyboardType="number-pad"
            error={errors.score}
          />
          <TextField
            label="Feedback"
            value={feedback}
            onChangeText={setFeedback}
            error={errors.feedback}
            multiline
          />
          <Button label="Save mark" onPress={() => void submitReview()} />
        </Card>
      ) : null}
      {!work.ownedByViewer && !reported ? (
        <Card>
          <TextField label="Report this work" value={reason} onChangeText={setReason} error={errors.reason} />
          <Button label="Report" variant="ghost" onPress={() => void submitReport()} />
        </Card>
      ) : null}
      {reported ? <Banner tone="success" message="Reported. Thank you for flagging it." /> : null}
    </Screen>
  );
}
