import { useAtomValue } from "jotai"
import { balanceAtom } from "../atoms/atoms"

export const userBalance = () => {
    const value = useAtomValue(balanceAtom);
    return value;
}