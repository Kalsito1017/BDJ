/**
 * Shared design-system components (DEC-005 `components/`).
 *
 * Every component here: takes its user-visible strings as props or resolves
 * them via i18n keys (never hard-coded English — DEC-014 finding M2), exposes
 * accessibility roles/labels (a11y.* keys), honours the system font scale,
 * and keeps touch targets >= 44 dp (addbeforerelease.txt §7/§10).
 */
export { Button, type ButtonProps, type ButtonVariant } from './Button';
export { Card, type CardProps } from './Card';
export { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';
export { DemoDataNotice, type DemoDataNoticeProps } from './DemoDataNotice';
export { EmptyState, type EmptyStateProps } from './EmptyState';
export { ErrorState, type ErrorStateProps } from './ErrorState';
export { ListSkeleton, type ListSkeletonProps } from './ListSkeleton';
export { Loader, type LoaderProps } from './Loader';
export { OfflineState, type OfflineStateProps } from './OfflineState';
export { PlaceholderScreen, type PlaceholderScreenProps } from './PlaceholderScreen';
export { ProvenanceBadge, type ProvenanceBadgeProps } from './ProvenanceBadge';
export { ScreenContainer, type ScreenContainerProps } from './ScreenContainer';
export {
  ScreenStatesPreview,
  type ScreenStatesPreviewProps,
} from './ScreenStatesPreview';
export { StatusMessage, type StatusMessageProps } from './StatusMessage';
export { TextInput, type TextInputProps } from './TextInput';
export { TimeoutState, type TimeoutStateProps } from './TimeoutState';
