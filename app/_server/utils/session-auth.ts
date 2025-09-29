import { getCurrentUser } from '@/app/_server/actions/users/current';

export async function withSessionAuth(handler: (user: any) => Promise<Response>) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        return await handler(user);
    } catch (error) {
        console.error("Session Auth Error:", error);
        return Response.json({ error: "Internal server error" }, { status: 500 });
    }
}
