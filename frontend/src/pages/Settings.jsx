import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, Moon, Sun, Palette, AlertCircle, Code } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();
  const {
    settings,
    setTheme,
    setAccent,
    setKurdPrefixEnabled,
    setDebugMode,
    setLogLevel,
    resetSettings
  } = useSettings();

  const accentOptions = [
    { value: 'green', label: 'Green', color: '#22c55e' },
    { value: 'blue', label: 'Blue', color: '#3b82f6' },
    { value: 'purple', label: 'Purple', color: '#a855f7' },
    { value: 'red', label: 'Red', color: '#ef4444' },
    { value: 'orange', label: 'Orange', color: '#f97316' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Theme Settings */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription className="text-slate-400">
              Customize the look and feel of the app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white flex items-center gap-2">
                  {settings.theme === 'dark' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                  Theme
                </Label>
                <p className="text-sm text-slate-400">
                  {settings.theme === 'dark' ? 'Dark mode' : 'Light mode'}
                </p>
              </div>
              <Switch
                checked={settings.theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
              />
            </div>

            {/* Accent Color */}
            <div className="space-y-2">
              <Label className="text-white">Accent Color</Label>
              <Select value={settings.accent} onValueChange={setAccent}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {accentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-white">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: option.color }}
                        />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Identity Settings */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Identity & Privacy</CardTitle>
            <CardDescription className="text-slate-400">
              Configure your public ID format and privacy settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* KURD Prefix */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">KURD Prefix</Label>
                <p className="text-sm text-slate-400">
                  Show KURD prefix in public handle
                </p>
              </div>
              <Switch
                checked={settings.kurdPrefixEnabled}
                onCheckedChange={setKurdPrefixEnabled}
              />
            </div>

            {/* ID Length (disabled for now) */}
            <div className="space-y-2 opacity-50">
              <Label className="text-white">ID Length</Label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={settings.idLength}
                  disabled
                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-white text-center cursor-not-allowed"
                />
                <p className="text-sm text-slate-400">
                  Currently fixed at 8 characters
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Developer Settings */}
        <Card className="bg-slate-900/50 border-slate-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Code className="h-5 w-5" />
              Developer
            </CardTitle>
            <CardDescription className="text-slate-400">
              Advanced debugging and logging options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Debug Mode */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Debug Mode</Label>
                <p className="text-sm text-slate-400">
                  Enable detailed console logging
                </p>
              </div>
              <Switch
                checked={settings.debugMode}
                onCheckedChange={setDebugMode}
              />
            </div>

            {/* Log Level */}
            <div className="space-y-2">
              <Label className="text-white flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Log Level
              </Label>
              <Select value={settings.logLevel} onValueChange={setLogLevel}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="error" className="text-white">Error</SelectItem>
                  <SelectItem value="warn" className="text-white">Warning</SelectItem>
                  <SelectItem value="info" className="text-white">Info</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                {settings.logLevel === 'error' && 'Only critical errors'}
                {settings.logLevel === 'warn' && 'Errors and warnings'}
                {settings.logLevel === 'info' && 'All information including debug'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Reset Button */}
        <Card className="bg-slate-900/50 border-slate-800 border-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white">Reset Settings</Label>
                <p className="text-sm text-slate-400">
                  Restore all settings to default values
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={resetSettings}
                className="bg-red-600 hover:bg-red-700"
              >
                Reset to Defaults
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
