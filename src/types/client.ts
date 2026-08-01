export interface SettingModule {
  name: string | string[];
  description: string | string[];
  category: string;
  component: React.FC;
}
