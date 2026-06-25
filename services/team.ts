import { prisma } from "@/lib/db";
import { fullName } from "@/lib/format";

export async function listTeam(entityId: string) {
  const members = await prisma.membership.findMany({
    where: { accountId: entityId, status: { not: "REVOKED" } },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return members.map((m) => ({
    id: m.id,
    name: m.user.firstName || m.user.lastName ? fullName(m.user) : null,
    email: m.user.email ?? m.inviteEmail,
    role: m.role,
    status: m.status,
    inviteToken: m.status === "INVITED" ? m.inviteToken : null,
    isPrincipal: false,
  }));
}
