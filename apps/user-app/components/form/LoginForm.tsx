"use client";   
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema } from "@/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@repo/ui/src/components/form";
import { Input } from "@repo/ui/src/components/input";
import { Button } from "@repo/ui/src/components/button";
import { useEffect, useState, useTransition } from "react";
import { login } from "@/actions/login";
import { CardWrapper } from "./CardWrapper";
import axios from "axios";
import { FormError, FormSuccess } from "./form-condition";
import { useSearchParams } from "next/navigation";

export const LoginForm = () => {
    const searchParams = useSearchParams();
    const urlError = searchParams.get("error") === "OAuthAccountNotLinked" ? "Email already in use" : "";
    const [success, setSuccess] = useState<string>("");
    const [error, setError] = useState<string>("");
    const [disabled, setDisabled] = useState<boolean>(false);
    const [isPending, startTransition] = useTransition();
    
    type LoginInput = z.infer<typeof LoginSchema>;
    
    const form = useForm<LoginInput>({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        }
    });
    
    useEffect(() => {
        if (urlError === "Email already in use") setError(urlError);
    }, [urlError])

    const sendCookie = async (data: LoginInput) => {
        try {
            const res: any = await axios.post(`https://primary.thakurkaran.xyz/api/v1/users/signin`, data, { withCredentials: true });
            console.log("Response from server:", res);
            if (res.status === 200) {
                console.log("Cookie sent successfully");
                return { success: "Login Successful", token: res.data.token };
            }
            console.log("Error:", res);
            return { error: "Unexpected error" };
        } catch (error: any) {
            console.log("Error sending cookie:", error);
            return { error: error?.response?.data?.message || "Something went wrong" };
        }
    }

    const submit = async (values: LoginInput) => {
        setDisabled(true);
        startTransition(async () => {
            const response = await login(values);
            console.log("Login response:", response);
            if (response && response.error) {
                setSuccess("");
                setError(response.error);
            }
            if (response && response.success) {
                setSuccess(response.success);
                if (response.redirect) {
                    console.log("Sending cookie to server...");
                    const req = await sendCookie(values);
                    if (req.error) {
                        setError(req.error);
                        console.log("Error sending cookie:", req.error);
                        setSuccess("");
                    }
                    if (req.success) {
                        console.log("Cookie sent successfully");
                        setSuccess(req.success);
                        localStorage.setItem("jwt", req.token)
                        setError("");
                        window.location.href = response.redirect;
                    }
                }
                setError("");
                form.reset();
            }
        });
    };
    return (
        <CardWrapper
            headerLabel="Welcome Back"
            backButtonLabel="Don't have an account?"
            backButtonhref="/auth/signup"
            showSocial={true}
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
                    <div className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="john@gmail.com"
                                            type="email"
                                            disabled={isPending}
                                        />    
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="********"
                                            type="password"
                                            disabled={isPending}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    { error && !success && <FormError message={error}/>}
                    { success && !error && <FormSuccess message={success}/>}
                    <Button type="submit" className="w-full" disabled={disabled}>
                        Login
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    )
}