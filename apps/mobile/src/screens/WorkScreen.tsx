import { BadgeKey, UserRole, type WorkDetail } from '@ncanny/types';
import { commentWorkSchema, reportWorkSchema, reviewWorkSchema } from '@ncanny/validation';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
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
  const [comment, setComment] = useState('');
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

  const react = async (kind: 'like' | 'smile') => {
    try {
      setWork(await getApiClient().content.react(work.id, { kind }));
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  const toggleBookmark = async () => {
    try {
      setWork(await getApiClient().content.bookmark(work.id));
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
      setWork(await getApiClient().content.comment(work.id, parsed.data));
      setComment('');
      setErrors({});
    } catch (error) {
      setErrors(toFormErrors(error));
    }
  };

  const award = async (key: (typeof BadgeKey)[keyof typeof BadgeKey]) => {
    try {
      setWork(await getApiClient().content.awardBadge(work.id, { key }));
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
        <Muted>
          {work.engagement.likeCount} likes · {work.engagement.smileCount} smileys · {work.engagement.commentCount} comments
        </Muted>
        <Button
          label={work.engagement.viewerLiked ? `Liked ${work.engagement.likeCount}` : `Like ${work.engagement.likeCount}`}
          variant="secondary"
          onPress={() => void react('like')}
        />
        <Button
          label={work.engagement.viewerSmiled ? `Smiled ${work.engagement.smileCount}` : `Smiley ${work.engagement.smileCount}`}
          variant="secondary"
          onPress={() => void react('smile')}
        />
        <Button
          label={work.engagement.bookmarked ? 'Saved' : 'Save'}
          variant="ghost"
          onPress={() => void toggleBookmark()}
        />
        {work.engagement.badges.map((badge) => (
          <Muted key={badge.key}>{badge.key} from {badge.awardedByName}</Muted>
        ))}
        {canReview
          ? [BadgeKey.SHIELD, BadgeKey.STAR, BadgeKey.MEDAL]
              .filter((key) => !work.engagement.badges.some((badge) => badge.key === key))
              .map((key) => <Button key={key} label={`Award ${key}`} variant="ghost" onPress={() => void award(key)} />)
          : null}
        {work.review ? (
          <Banner
            tone="info"
            message={`Marked ${work.review.score}/100 by ${work.review.reviewerName}. ${work.review.feedback}`}
          />
        ) : null}
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Comments</Text>
        {work.comments.length === 0 ? <Muted>No comments on this work yet.</Muted> : null}
        {work.comments.map((note) => (
          <View key={note.id}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>
              {note.authorName} · {note.authorCannyId}
            </Text>
            <Text style={{ color: colors.text }}>{note.body}</Text>
          </View>
        ))}
        <TextField label="Add a comment" value={comment} onChangeText={setComment} error={errors.body} multiline />
        <Button label="Comment" onPress={() => void submitComment()} />
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
