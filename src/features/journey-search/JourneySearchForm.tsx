/**
 * JourneySearchForm — departure/arrival/date search (plan.md §3.1, Phase 3).
 *
 * react-hook-form + Zod (`zodResolver`; verified compatible with zod 4 in
 * this repo). The schema (validation.ts) is the single validation source and
 * its issue messages are i18n KEYS — the form renders `t(issue.message)`.
 * Every rule from the task contract is enforced: both stations required,
 * from ≠ to, date required + strict YYYY-MM-DD + not in the past (Europe/
 * Sofia "today") + not more than 90 days ahead.
 *
 * Typed values are RETAINED when validation fails (checklist §7): the form
 * is fully controlled by react-hook-form and a failed submit never resets
 * fields. Station values come from the station picker route through the
 * pending-selection store (see ../station-picker/selection.ts).
 *
 * Nothing here requires an account (plan.md 17.2).
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, TextInput } from '../../components';
import type { TFunction } from '../../i18n';
import { useTheme } from '../../theme';
import type { ISODate } from '../../types/common';
import type { JourneySearch } from '../../types/journey';
import type { Station } from '../../types/station';
import {
  subscribePendingStationSelection,
  takePendingStationSelection,
} from '../station-picker/selection';

import { JOURNEY_SEARCH_KEYS } from './translationKeys';
import {
  addDaysIso,
  createJourneySearchFormSchema,
  systemTodayIso,
  type JourneySearchFormValues,
} from './validation';

export interface JourneySearchFormProps {
  t: TFunction;
  /**
   * "Today" source for the date rules and chips (Europe/Sofia). Defaults to
   * `systemTodayIso`, evaluated at validation/event time — injectable for
   * deterministic tests.
   */
  getToday?: () => ISODate;
  defaultValues?: Partial<JourneySearchFormValues>;
  onSelectFromStation: () => void;
  onSelectToStation: () => void;
  onSubmit: (search: JourneySearch) => void;
  testID?: string;
}

interface StationSelectFieldProps {
  t: TFunction;
  label: string;
  placeholder: string;
  station: Station | null;
  error?: string;
  onPress: () => void;
  testID?: string;
}

function StationSelectField({
  t,
  label,
  placeholder,
  station,
  error,
  onPress,
  testID,
}: StationSelectFieldProps) {
  const theme = useTheme();
  const { colors, radii, spacing, typography: type } = theme;

  return (
    <View style={[styles.field, { marginBottom: spacing.md }]}>
      <Text
        style={[type.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}
      >
        {label}
        <Text style={{ color: colors.errorText }}> *</Text>
      </Text>
      <Pressable
        accessibilityLabel={station ? `${label}: ${station.name}` : label}
        accessibilityHint={placeholder}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [
          styles.selectField,
          {
            backgroundColor: pressed ? colors.surfaceAlt : colors.surface,
            borderColor: error ? colors.error : colors.borderStrong,
            borderRadius: radii.sm,
            minHeight: 44,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm,
          },
        ]}
        testID={testID}
      >
        <Text
          style={[
            type.body,
            { color: station ? colors.textPrimary : colors.textDisabled },
          ]}
        >
          {station ? station.name : placeholder}
        </Text>
      </Pressable>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[type.bodySmall, { color: colors.errorText, marginTop: spacing.xs }]}
          testID={testID ? `${testID}-error` : undefined}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}

export function JourneySearchForm({
  t,
  getToday = systemTodayIso,
  defaultValues,
  onSelectFromStation,
  onSelectToStation,
  onSubmit,
  testID,
}: JourneySearchFormProps) {
  const theme = useTheme();
  const { colors, spacing, typography: type } = theme;

  const schema = useMemo(() => createJourneySearchFormSchema(getToday), [getToday]);
  const { control, handleSubmit, setValue, getValues, formState } =
    useForm<JourneySearchFormValues>({
      resolver: zodResolver(schema),
      defaultValues: {
        fromStation: null,
        toStation: null,
        date: '',
        ...defaultValues,
      },
    });

  // Station selections arrive from the picker modal while this form stays
  // mounted underneath it.
  useEffect(() => {
    return subscribePendingStationSelection(() => {
      const selection = takePendingStationSelection();
      if (!selection) return;
      setValue(
        selection.field === 'to' ? 'toStation' : 'fromStation',
        selection.station,
        {
          shouldDirty: true,
          shouldTouch: true,
        },
      );
    });
  }, [setValue]);

  const swapStations = () => {
    const from = getValues('fromStation');
    const to = getValues('toStation');
    setValue('fromStation', to, { shouldDirty: true });
    setValue('toStation', from, { shouldDirty: true });
  };

  const fieldError = (name: keyof JourneySearchFormValues): string | undefined => {
    const message = formState.errors[name]?.message;
    return typeof message === 'string' ? t(message) : undefined;
  };

  return (
    <View testID={testID}>
      <Controller
        control={control}
        name="fromStation"
        render={({ field: { value } }) => (
          <StationSelectField
            error={fieldError('fromStation')}
            label={t(JOURNEY_SEARCH_KEYS.fromLabel)}
            onPress={onSelectFromStation}
            placeholder={t(JOURNEY_SEARCH_KEYS.fromPlaceholder)}
            station={value ?? null}
            t={t}
            testID={testID ? `${testID}-from` : undefined}
          />
        )}
      />
      <Button
        accessibilityHint={t(JOURNEY_SEARCH_KEYS.swapLabel)}
        label={t(JOURNEY_SEARCH_KEYS.swapLabel)}
        onPress={swapStations}
        testID={testID ? `${testID}-swap` : undefined}
        variant="secondary"
      />
      <View style={{ height: spacing.md }} />
      <Controller
        control={control}
        name="toStation"
        render={({ field: { value } }) => (
          <StationSelectField
            error={fieldError('toStation')}
            label={t(JOURNEY_SEARCH_KEYS.toLabel)}
            onPress={onSelectToStation}
            placeholder={t(JOURNEY_SEARCH_KEYS.toPlaceholder)}
            station={value ?? null}
            t={t}
            testID={testID ? `${testID}-to` : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="date"
        render={({ field: { value, onChange } }) => (
          <View>
            <TextInput
              autoCapitalize="none"
              error={fieldError('date')}
              hint={t(JOURNEY_SEARCH_KEYS.dateHint)}
              label={t(JOURNEY_SEARCH_KEYS.dateLabel)}
              maxLength={10}
              onChangeText={onChange}
              required
              placeholder={t(JOURNEY_SEARCH_KEYS.datePlaceholder)}
              testID={testID ? `${testID}-date` : undefined}
              value={value}
            />
            <Text
              style={[
                type.caption,
                { color: colors.textSecondary, marginBottom: spacing.md },
              ]}
            >
              {t(JOURNEY_SEARCH_KEYS.dateHint)}
            </Text>
          </View>
        )}
      />
      <View style={[styles.chips, { gap: spacing.sm }]}>
        <Button
          label={t(JOURNEY_SEARCH_KEYS.today)}
          onPress={() => setValue('date', getToday(), { shouldDirty: true })}
          testID={testID ? `${testID}-today` : undefined}
          variant="secondary"
        />
        <Button
          label={t(JOURNEY_SEARCH_KEYS.tomorrow)}
          onPress={() =>
            setValue('date', addDaysIso(getToday(), 1), { shouldDirty: true })
          }
          testID={testID ? `${testID}-tomorrow` : undefined}
          variant="secondary"
        />
      </View>
      <View style={{ height: spacing.md }} />
      <Button
        accessibilityHint={t(JOURNEY_SEARCH_KEYS.submitHint)}
        label={t(JOURNEY_SEARCH_KEYS.submitCta)}
        onPress={handleSubmit((values) => {
          // Safe: the schema guarantees both stations are valid here.
          const fromStation = values.fromStation as Station;
          const toStation = values.toStation as Station;
          onSubmit({
            fromStationId: fromStation.id,
            toStationId: toStation.id,
            date: values.date.trim(),
          });
        })}
        testID={testID ? `${testID}-submit` : undefined}
        variant="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    alignSelf: 'stretch',
  },
  selectField: {
    alignSelf: 'stretch',
    borderWidth: 1,
    justifyContent: 'center',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
