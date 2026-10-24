/**
 * Station picker feature (Phase 3) — public surface.
 *
 * `StationPickerView` is pure (injected data + translations) and is what
 * the mobile-ui tests exercise; `StationPickerScreen` is the thin route
 * wiring over the shared hooks contract (src/hooks).
 */
export {
  StationPickerScreen,
  type StationPickerScreenProps,
} from './StationPickerScreen';
export { StationRow, type StationRowProps } from './StationRow';
export {
  STATION_QUERY_MAX_LENGTH,
  StationPickerView,
  type StationPickerViewProps,
} from './StationPickerView';
export {
  resetPendingStationSelection,
  setPendingStationSelection,
  subscribePendingStationSelection,
  takePendingStationSelection,
  type PendingStationSelection,
  type StationField,
} from './selection';
export { STATION_PICKER_KEYS, type StationPickerKey } from './translationKeys';
