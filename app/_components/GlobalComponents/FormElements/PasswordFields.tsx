import { useTranslations } from "next-intl";
interface PasswordFieldsProps {
  password: string;
  setPassword: (password: string) => void;
  confirmPassword: string;
  setConfirmPassword: (confirmPassword: string) => void;
  disabled: boolean;
  isEditMode: boolean;
}

export const PasswordFields = ({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  disabled,
  isEditMode,
}: PasswordFieldsProps) => {
  const t = useTranslations();
  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-2">
          {isEditMode ? "New Password" : "Password"}
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-jotty focus:outline-none focus:ring-none focus:ring-ring"
          placeholder={t('common.enterPassword')}
          disabled={disabled}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">
          Confirm {isEditMode && "New"} Password
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 bg-background border border-border rounded-jotty focus:outline-none focus:ring-none focus:ring-ring"
          placeholder={t('common.confirmPassword')}
          disabled={disabled}
        />
      </div>
    </>
  )
};
