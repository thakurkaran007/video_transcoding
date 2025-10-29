import { setKey } from "./redis";

async function exampleUsage() {
    const success = await setKey("exampleKey", "exampleValue", { EX: 3600 });
    if (success) {
        console.log("Key set successfully");
        return;
    } else {
        console.log("Failed to set key");
    }
}

exampleUsage();