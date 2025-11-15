const isSuper = role => String(role || "").toLowerCase() === "superadmin";

/** superadmin เห็นได้ทุกสาขา */
function canSeeAll(req) {
  return isSuper(req?.user?.role);
}

/** ถ้าไม่ใช่ superadmin ต้องอยู่สาขาเดียวกันเท่านั้น */
function assertBranch(req, targetBranchId) {
  //superAdmin 
  if (canSeeAll(req)) return { ok: true };

  if (!targetBranchId) {
    return { ok: false, error: "branchId required" };
  }

  const userBranch = String(req?.user?.branchId || "");
  const target = String(targetBranchId || "");

  if (!userBranch || !target || userBranch !== target) {
    return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  }
  return { ok: true };
}

module.exports = { canSeeAll, assertBranch, isSuper };
