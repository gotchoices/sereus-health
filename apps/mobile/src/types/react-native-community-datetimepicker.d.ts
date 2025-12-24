declare module '@react-native-community/datetimepicker' {
  import * as React from 'react';
  import type { ViewProps } from 'react-native';

  export type DateTimePickerEvent = {
    type: 'set' | 'dismissed' | string;
    nativeEvent?: unknown;
  };

  export type DateTimePickerMode = 'date' | 'time' | 'datetime';

  export type DateTimePickerDisplay = 'default' | 'spinner' | 'clock' | 'calendar' | 'compact' | 'inline';

  export interface DateTimePickerProps extends ViewProps {
    value: Date;
    mode?: DateTimePickerMode;
    display?: DateTimePickerDisplay;
    onChange?: (event: DateTimePickerEvent, date?: Date) => void;
  }

  const DateTimePicker: React.ComponentType<DateTimePickerProps>;
  export default DateTimePicker;
}


