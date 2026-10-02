// MEMBRO é o acesso básico. Os únicos cargos administrativos são
// MODERADOR, ADMINISTRADOR (exibido como "Adm"), DONO e SUPREMO.
const ROLE_ORDER = ['MEMBRO', 'MODERADOR', 'ADMINISTRADOR', 'DONO', 'SUPREMO'];

function roleAtLeast(role, minRole) {
  const roleLevel = ROLE_ORDER.indexOf(role);
  const minimumLevel = ROLE_ORDER.indexOf(minRole);
  return roleLevel >= 0 && minimumLevel >= 0 && roleLevel >= minimumLevel;
}

/** Bloqueia a rota se o membro autenticado não tiver ao menos o papel informado. */
function requireRole(minRole) {
  return (req, res, next) => {
    if (!req.member) return res.status(401).json({ error: 'Não autenticado.' });
    if (!roleAtLeast(req.member.role, minRole)) {
      return res.status(403).json({ error: `Ação exige papel "${minRole}" ou superior.` });
    }
    next();
  };
}

module.exports = { requireRole, roleAtLeast, ROLE_ORDER };
