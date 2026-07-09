import {
  Button,
  Card,
  Chip,
  Dropdown,
  Heading,
  Label,
  Paragraph,
  ProgressBar,
  Separator,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
} from '@heroui/react';
import { ChevronDown } from 'lucide-react';

import { Input } from '@/components/Input';
import {
  COLOR_SCHEME_OPTIONS,
  THEME_FORM_RADIUS_OPTIONS,
  THEME_MODE_OPTIONS,
  THEME_RADIUS_OPTIONS,
  useColorScheme,
  useThemeShape,
  type ColorScheme,
  type ColorSchemeOption,
  type ThemeFormRadius,
  type ThemeFormRadiusOption,
  type ThemeMode,
  type ThemeRadius,
  type ThemeRadiusOption,
} from '@/theme';

import layout from '../style.module.less';
import styles from './style.module.less';

type ThemeModeSectionProps = {
  value: string;
  onChange: (mode: ThemeMode) => void;
};

function ThemeModeSection({ value, onChange }: ThemeModeSectionProps) {
  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        明暗模式
      </Heading>
      <Tabs
        className={styles.modeTabs}
        selectedKey={value}
        onSelectionChange={(next) => onChange(String(next) as ThemeMode)}
      >
        <Tabs.ListContainer className={styles.modeTabsListContainer}>
          <Tabs.List className={styles.modeTabsList} aria-label="明暗模式">
            {THEME_MODE_OPTIONS.map((option) => (
              <Tabs.Tab key={option.id} id={option.id} className={styles.modeTab}>
                {option.label}
                <Tabs.Indicator />
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>
      </Tabs>
    </section>
  );
}

type ColorSchemeSectionProps = {
  value: ColorScheme;
  onChange: (scheme: ColorScheme) => void;
};

function ColorSchemeSection({ value, onChange }: ColorSchemeSectionProps) {
  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        主题配色（Base / Accent）
      </Heading>
      <div className={styles.schemeGrid}>
        <ToggleButtonGroup
          aria-label="主题配色"
          selectionMode="single"
          selectedKeys={new Set([value])}
          onSelectionChange={(keys) => {
            const [key] = [...keys];
            if (key != null) onChange(String(key) as ColorScheme);
          }}
          className={styles.schemeGroup}
          orientation="horizontal"
          isDetached
        >
          {COLOR_SCHEME_OPTIONS.map((option) => (
            <SchemeOption key={option.id} option={option} />
          ))}
        </ToggleButtonGroup>
      </div>
    </section>
  );
}

type ThemeShapeSectionProps = {
  radius: ThemeRadius;
  formRadius: ThemeFormRadius;
  onRadiusChange: (radius: ThemeRadius) => void;
  onFormRadiusChange: (radius: ThemeFormRadius) => void;
};

function ThemeShapeSection({
  radius,
  formRadius,
  onRadiusChange,
  onFormRadiusChange,
}: ThemeShapeSectionProps) {
  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        圆角
      </Heading>
      <div className={styles.shapeControls}>
        <ShapeOptionGroup
          label="Radius"
          value={radius}
          options={THEME_RADIUS_OPTIONS}
          onChange={(next) => onRadiusChange(next as ThemeRadius)}
        />
        <ShapeOptionGroup
          label="Radius Form"
          value={formRadius}
          options={THEME_FORM_RADIUS_OPTIONS}
          onChange={(next) => onFormRadiusChange(next as ThemeFormRadius)}
        />
      </div>
    </section>
  );
}

type ShapeOptionGroupProps = {
  label: string;
  value: ThemeRadius | ThemeFormRadius;
  options: Array<ThemeRadiusOption | ThemeFormRadiusOption>;
  onChange: (radius: ThemeRadius | ThemeFormRadius) => void;
};

function ShapeOptionGroup({ label, value, options, onChange }: ShapeOptionGroupProps) {
  return (
    <div className={styles.shapeGroupBlock}>
      <span className={styles.shapeGroupLabel}>{label}</span>
      <ToggleButtonGroup
        aria-label={label}
        selectionMode="single"
        selectedKeys={new Set([value])}
        onSelectionChange={(keys) => {
          const [key] = [...keys];
          if (key != null) onChange(String(key) as ThemeRadius | ThemeFormRadius);
        }}
        className={styles.shapeGroup}
        orientation="horizontal"
        isDetached
      >
        {options.map((option) => (
          <ToggleButton key={option.id} id={option.id} className={styles.shapeOption}>
            <span className={styles.shapeLabel}>{option.label}</span>
            <span className={styles.shapeValue}>{option.description}</span>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );
}

type SchemeOptionProps = {
  option: ColorSchemeOption;
};

function SchemeOption({ option }: SchemeOptionProps) {
  return (
    <ToggleButton id={option.id} data-scheme-preview={option.id} className={styles.schemeOption}>
      <span className={styles.schemePreview}>
        <span className={styles.schemeSwatch} />
        <span className={styles.schemeSwatch} />
      </span>
      <span className={styles.schemeLabel}>{option.label}</span>
      <span className={styles.schemeDescription}>{option.description}</span>
    </ToggleButton>
  );
}

function ThemePreviewSection() {
  return (
    <section className={styles.section}>
      <Heading level={3} className={layout.sectionTitle}>
        主题验证
      </Heading>
      <div className={styles.previewGrid}>
        <Card className={styles.previewCard}>
          <Card.Header className={styles.previewHeader}>
            <Card.Title>HeroUI 组件</Card.Title>
            <Chip size="sm" variant="soft">
              <Chip.Label>Soft</Chip.Label>
            </Chip>
          </Card.Header>
          <Card.Content className={styles.previewBody}>
            <div className={styles.previewActions}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Dropdown>
                <Dropdown.Trigger>
                  <Button variant="tertiary">
                    菜单
                    <ChevronDown size={14} />
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover>
                  <Dropdown.Menu aria-label="主题验证菜单">
                    <Dropdown.Item key="edit">编辑</Dropdown.Item>
                    <Dropdown.Item key="copy">复制</Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>
            <TextField aria-label="主题验证输入框" className={styles.previewField}>
              <Label>输入框</Label>
              <Input placeholder="Radius Form 控制这里" />
            </TextField>
            <ProgressBar
              aria-label="主题验证进度"
              value={64}
              valueLabel="64%"
              className={styles.previewProgress}
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
              <ProgressBar.Output />
            </ProgressBar>
          </Card.Content>
        </Card>

        <div className={styles.previewDialog}>
          <div className={styles.previewDialogHeader}>
            <span>Modal / Table 外壳</span>
            <span className={styles.previewDialogBadge}>Token</span>
          </div>
          <div className={styles.previewTable}>
            <div className={styles.previewTableRow}>
              <span>Button</span>
              <span>--radius-3xl</span>
            </div>
            <div className={styles.previewTableRow}>
              <span>Input</span>
              <span>--radius-field</span>
            </div>
            <div className={styles.previewTableRow}>
              <span>Table</span>
              <span>--table-shell-radius</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AppearanceHeader() {
  return (
    <header className={layout.pageHeader}>
      <Heading level={1} className={layout.pageTitle}>
        外观
      </Heading>
      <Paragraph size="sm" color="muted" className={layout.pageSubtitle}>
        设置明暗与主题
      </Paragraph>
    </header>
  );
}

function Appearance() {
  const { theme, setTheme } = useTheme();
  const { colorScheme, setColorScheme } = useColorScheme();
  const { radius, formRadius, setRadius, setFormRadius } = useThemeShape();

  return (
    <div className={layout.pageContainer}>
      <AppearanceHeader />
      <Card className={styles.panel}>
        <Card.Content className={styles.body}>
          <ThemeModeSection value={theme} onChange={setTheme} />
          <Separator className={styles.divider} />
          <ColorSchemeSection value={colorScheme} onChange={setColorScheme} />
          <Separator className={styles.divider} />
          <ThemeShapeSection
            radius={radius}
            formRadius={formRadius}
            onRadiusChange={setRadius}
            onFormRadiusChange={setFormRadius}
          />
          <Separator className={styles.divider} />
          <ThemePreviewSection />
        </Card.Content>
      </Card>
    </div>
  );
}

export default Appearance;
