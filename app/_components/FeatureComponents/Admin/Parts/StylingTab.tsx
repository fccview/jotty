import { CssEditor } from "@/app/_components/GlobalComponents/FormElements/CSSEditor";
import { Button } from "@/app/_components/GlobalComponents/Buttons/Button";
import { Input } from "@/app/_components/GlobalComponents/FormElements/Input";
import { Modal } from "@/app/_components/GlobalComponents/Modals/Modal";
import { Loader2, Plus, Palette, Edit, Trash2 } from "lucide-react";
import { useStyling } from "@/app/_hooks/useStyling";
import { ThemePreview } from "@/app/_components/FeatureComponents/Admin/Parts/ThemePreview";
import { FormWrapper } from "@/app/_components/GlobalComponents/FormElements/FormWrapper";

export const StylingTab = () => {
  const {
    css,
    isLoadingCss,
    isSavingCss,
    hasCssChanges,
    handleCssChange,
    handleSaveCss,
    isLoadingThemes,
    isSavingThemes,
    themeModalOpen,
    setThemeModalOpen,
    editingTheme,
    themeForm,
    handleCreateTheme,
    handleEditTheme,
    handleDeleteTheme,
    handleSaveTheme,
    handleThemeFormChange,
    getCustomThemes,
  } = useStyling();

  return (
    <div className="space-y-6">
      <div className="bg-card">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              Styling
            </h2>
            <p className="text-muted-foreground">
              Configure the styling of the application.
            </p>
          </div>

          <FormWrapper
            title="Custom Themes"
            action={
              <Button
                onClick={handleCreateTheme}
                disabled={isLoadingThemes}
                size="sm"
              >
                <Plus className="mr-2 h-3 w-3" />
                Create Theme
              </Button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {getCustomThemes().map((theme) => (
                <div
                  key={theme.id}
                  className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/30"
                >
                  <div className="flex items-center space-x-2">
                    <theme.icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{theme.name}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditTheme(theme.id)}
                      className="h-6 w-6 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTheme(theme.id)}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {getCustomThemes().length === 0 && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                  No custom themes created yet. Click &quot;Create Theme&quot;
                  to get started.
                </p>
              )}
            </div>
          </FormWrapper>

          <FormWrapper
            title="Custom CSS"
            action={
              <Button
                onClick={handleSaveCss}
                disabled={isSavingCss || !hasCssChanges || isLoadingCss}
                size="sm"
              >
                {isSavingCss ? <></> : "Save CSS"}
              </Button>
            }
          >
            <div className="w-full max-h-[600px] overflow-auto">
              {isLoadingCss ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <CssEditor value={css} onChange={handleCssChange} />
              )}
            </div>
            {hasCssChanges && (
              <p className="text-xs text-muted-foreground">
                You have unsaved CSS changes.
              </p>
            )}
          </FormWrapper>
        </div>
      </div>

      <Modal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        title={editingTheme ? "Edit Theme" : "Create Theme"}
        titleIcon={<Palette className="h-5 w-5" />}
        className="!w-full lg:!max-w-[90vw] !h-[90vh] overflow-y-auto !max-h-[900px]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="space-y-4">
              <Input
                id="themeName"
                label="Theme Name"
                type="text"
                value={themeForm.name}
                defaultValue={themeForm.name}
                onChange={(e) => handleThemeFormChange("name", e.target.value)}
                placeholder="My Custom Theme"
              />

              <Input
                id="themeIcon"
                label="Icon Name"
                type="text"
                value={themeForm.icon}
                defaultValue={themeForm.icon}
                onChange={(e) => handleThemeFormChange("icon", e.target.value)}
                placeholder="Palette"
                description={
                  <>
                    <a
                      className="text-primary hover:text-primary/80 underline"
                      href="https://lucide.dev/icons/"
                      target="_blank"
                    >
                      Lucide icon
                    </a>{" "}
                    name (e.g., Palette, Sun, Moon)
                  </>
                }
              />
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">Color Variables</h4>
              <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                {Object.entries(themeForm.colors).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <label className="text-xs font-mono text-muted-foreground min-w-0 flex-1">
                      {key}
                    </label>
                    <input
                      type="color"
                      value={
                        value
                          ? `#${value
                              .split(" ")
                              .map((v) => {
                                const num = parseInt(v);
                                return num.toString(16).padStart(2, "0");
                              })
                              .join("")}`
                          : "#000000"
                      }
                      onChange={(e) => {
                        const hex = e.target.value;
                        const r = parseInt(hex.substring(1, 3), 16);
                        const g = parseInt(hex.substring(3, 5), 16);
                        const b = parseInt(hex.substring(5, 7), 16);
                        const rgbValue = `${r} ${g} ${b}`;
                        handleThemeFormChange(key, rgbValue);
                      }}
                      className="w-8 h-8 rounded border border-border cursor-pointer"
                    />
                    <Input
                      id={key}
                      type="text"
                      value={value}
                      defaultValue={value}
                      onChange={(e) =>
                        handleThemeFormChange(key, e.target.value)
                      }
                      placeholder="255 255 255"
                      className="flex-1 text-xs font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setThemeModalOpen(false)}
                disabled={isSavingThemes}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTheme} disabled={isSavingThemes}>
                {isSavingThemes ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingTheme ? (
                  "Update Theme"
                ) : (
                  "Create Theme"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium">Live Preview</h4>
            <div className="border border-border rounded-lg">
              <ThemePreview colors={themeForm.colors} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
