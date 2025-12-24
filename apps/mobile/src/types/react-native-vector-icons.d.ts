declare module 'react-native-vector-icons/Ionicons' {
  import { ComponentType } from 'react';
  import { TextStyle } from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string;
    style?: TextStyle | TextStyle[];
  }

  const Ionicons: ComponentType<IconProps>;
  export default Ionicons;
}


