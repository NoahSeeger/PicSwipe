import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { DynamicColorIOS } from 'react-native';

export default function TabLayout() {
  return (
    <NativeTabs
      style={{
        color: DynamicColorIOS({
          dark: 'white',
          light: 'black',
        }),
        tintColor: DynamicColorIOS({
          dark: 'white',
          light: 'black',
        }),
      }}
    >
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "photo", selected: "photo.fill" }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cleanup">
        <Icon sf={{ default: "paintbrush", selected: "paintbrush.fill" }} />
        <Label>Cleanup</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="albums">
        <Icon sf={{ default: "rectangle.stack", selected: "rectangle.stack.fill" }} />
        <Label>Alben</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: "gear", selected: "gear" }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
// ...
