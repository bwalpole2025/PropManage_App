import { prisma } from "@/lib/db";

export async function listTeam(entityId: string) {
  const members = await prisma.membership.findMany({
    where: { landlordEntityId: entityId, status: { not: "REVOKED" } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  return members.map((m) => ({
    id: m.id,
    name: m.user.name,
    email: m.user.email ?? m.inviteEmail,
    role: m.role,
    status: m.status,
    inviteToken: m.status === "INVITED" ? m.inviteToken : null,
    isPrincipal: false,
  }));
}
