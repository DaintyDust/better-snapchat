import React from 'react';
import { defaultSettingValues, SettingId } from '@lib/constants';
import settings from '@lib/settings';

/**
 * Provides a React state hook synchronized with the external settings store for the given setting key.
 *
 * @param key - Identifier of the setting to read and synchronize
 * @returns A tuple where the first element is the current value of the setting for `key`, and the second is a setter that updates local state and persists the new value to the settings store
 */
export default function useSettingState<T extends SettingId>(key: T): [(typeof defaultSettingValues)[T], (newValue: (typeof defaultSettingValues)[T]) => void] {
  const [value, setValue] = React.useState<(typeof defaultSettingValues)[T]>(() => {
    const initialValue = settings.getSetting(key);
    return initialValue;
  });

  React.useEffect(() => {
    function updateValue(newValue: (typeof defaultSettingValues)[T]) {
      setValue(newValue);
    }
    settings.on(`${key}.setting:update`, updateValue);
    return () => {
      settings.off(`${key}.setting:update`, updateValue);
    };
  }, [key]);

  function updateSettingValue(newValue: (typeof defaultSettingValues)[T]) {
    setValue(newValue);
    settings.setSetting(key, newValue);
  }

  return [value, updateSettingValue];
}
