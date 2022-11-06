export interface IProps {
    title: string;
    children: JSX.Element[];
    acceptDisabled: boolean;
    onAccept: () => void;
    onCancel: () => void;

    showKeyboard?: boolean;
    onKeyboardChange?: (value: string) => void;
    keyboardValue?: string;
}
