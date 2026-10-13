import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Button } from './Button';
import { FormField } from './FormField';
import { Input } from './Input';
import { Modal } from './Modal';
import { BottomNav, SideNav, type NavItem } from './Navigation';
import { ProfileHeader } from './ProfileHeader';
import { ProgressBar } from './Stats';
import { Tabs, TabPanel } from './Tabs';
import { ToastProvider, useToast } from './Toast';
import { initialsOf } from './Avatar';

describe('Button', () => {
  it('marks itself busy and blocks activation while loading', async () => {
    const onClick = jest.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );

    const button = screen.getByRole('button', { name: /save/i });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe('FormField', () => {
  it('labels the control and describes it with hint and error', () => {
    render(
      <FormField label="Email" hint="Use your school email" error="Email is required" required>
        {({ id, describedBy, invalid }) => (
          <Input id={id} aria-describedby={describedBy} invalid={invalid} />
        )}
      </FormField>,
    );

    const input = screen.getByLabelText(/email/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');

    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Email is required');

    const describedBy = input.getAttribute('aria-describedby') ?? '';
    expect(describedBy.split(' ')).toHaveLength(2);
    expect(describedBy).toContain(error.id);
  });
});

describe('Tabs', () => {
  function Harness() {
    const [active, setActive] = useState('paintings');
    return (
      <>
        <Tabs
          aria-label="Content"
          activeId={active}
          onChange={setActive}
          items={[
            { id: 'paintings', label: 'Paintings' },
            { id: 'essays', label: 'Essays' },
            { id: 'elocution', label: 'Elocution' },
          ]}
        />
        <TabPanel id="paintings" activeId={active}>
          Paintings panel
        </TabPanel>
        <TabPanel id="essays" activeId={active}>
          Essays panel
        </TabPanel>
        <TabPanel id="elocution" activeId={active}>
          Elocution panel
        </TabPanel>
      </>
    );
  }

  it('moves between tabs with the arrow keys and wraps at the ends', async () => {
    render(<Harness />);

    const paintings = screen.getByRole('tab', { name: 'Paintings' });
    expect(paintings).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Paintings panel')).toBeInTheDocument();

    paintings.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Essays' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Essays panel')).toBeInTheDocument();

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Elocution' })).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps only the active tab in the tab order', () => {
    render(<Harness />);
    expect(screen.getByRole('tab', { name: 'Paintings' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Essays' })).toHaveAttribute('tabindex', '-1');
  });
});

describe('Modal', () => {
  it('is a labelled dialog that traps focus and closes on Escape', async () => {
    const onClose = jest.fn();
    render(
      <Modal open onClose={onClose} title="Delete submission" description="This cannot be undone">
        <Button>Confirm</Button>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Delete submission');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone');
    expect(within(dialog).getByRole('button', { name: 'Confirm' })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders nothing when closed', () => {
    render(
      <Modal open={false} onClose={jest.fn()} title="Hidden">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Toast', () => {
  function Harness() {
    const { showToast } = useToast();
    return (
      <Button onClick={() => showToast({ tone: 'danger', title: 'Upload failed', duration: null })}>
        Trigger
      </Button>
    );
  }

  it('announces an error toast and dismisses it on request', async () => {
    render(
      <ToastProvider>
        <Harness />
      </ToastProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Trigger' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed');

    await userEvent.click(screen.getByRole('button', { name: /dismiss notification/i }));
    expect(screen.queryByText('Upload failed')).not.toBeInTheDocument();
  });
});

describe('Navigation', () => {
  const items: NavItem[] = [
    { id: 'home', label: 'Home', href: '/home', icon: 'H' },
    { id: 'explore', label: 'Explore', href: '/explore', icon: 'E' },
    { id: 'activity', label: 'Activity', href: '/activity', icon: 'A', count: 3 },
    { id: 'profile', label: 'Profile', href: '/profile', icon: 'P' },
  ];

  it('marks the active destination as the current page', () => {
    render(<SideNav items={items} activeId="explore" />);

    expect(screen.getByRole('link', { name: /explore/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /^home$/i })).not.toHaveAttribute('aria-current');
  });

  it('exposes unread counts as text rather than colour alone', () => {
    render(<SideNav items={items} activeId="home" />);
    expect(screen.getByRole('link', { name: /activity 3 unread/i })).toBeInTheDocument();
  });

  it('gives the create action an accessible name on mobile', async () => {
    const onCreate = jest.fn();
    render(<BottomNav items={items} activeId="home" onCreate={onCreate} />);

    await userEvent.click(screen.getByRole('button', { name: 'Create' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileHeader', () => {
  it('shows the Canny ID alongside the name', () => {
    render(
      <ProfileHeader
        fullName="Aarav Menon"
        cannyId="NCS-048213"
        subtitle="Grade 8"
        schoolName="Lakeside High"
        level={4}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Aarav Menon' })).toBeInTheDocument();
    expect(screen.getByText('NCS-048213')).toBeInTheDocument();
    expect(screen.getByText('Level 4')).toBeInTheDocument();
  });
});

describe('ProgressBar', () => {
  it('reports progress to assistive technology and clamps out-of-range values', () => {
    render(<ProgressBar value={150} max={100} label="XP to next level" />);

    const bar = screen.getByRole('progressbar', { name: 'XP to next level' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });
});

describe('initialsOf', () => {
  it('uses the first and last name parts', () => {
    expect(initialsOf('Aarav Menon')).toBe('AM');
    expect(initialsOf('Aarav Kumar Menon')).toBe('AM');
    expect(initialsOf('Aarav')).toBe('A');
    expect(initialsOf('   ')).toBe('?');
  });
});
