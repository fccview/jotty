"use client";

import { ProfileTab } from "@/app/_components/FeatureComponents/Profile/Parts/ProfileTab";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { useState, useEffect } from "react";
import { getLoginType } from "@/app/_server/actions/session";
import { Loading } from "@/app/_components/GlobalComponents/Layout/Loading";

export default function UserInfoPage() {
    const { user } = useAppMode();
    const [isSsoUser, setIsSsoUser] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadLoginType = async () => {
            const loginType = await getLoginType();
            setIsSsoUser(loginType === "sso");
            setIsLoading(false);
        };
        loadLoginType();
    }, []);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <ProfileTab
            user={user}
            isAdmin={user?.isAdmin || false}
            setUser={() => { }}
            isSsoUser={isSsoUser}
        />
    );
}
