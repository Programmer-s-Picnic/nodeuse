"use strict";
// Collaborative Task Manager: MySQL persistence, ownership, sharing, comments.
function installTasks(app, { dbPool, registerTableReady, requireLogin, csrfCheck, sessionFor }) {
  const schemaReady = (async () => {
    await registerTableReady;
    await dbPool.query("CREATE TABLE IF NOT EXISTS tasks (taskid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, username VARCHAR(40) NOT NULL, title VARCHAR(200) NOT NULL, description TEXT NULL, priority ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium', status ENUM('Pending','In Progress','Completed') NOT NULL DEFAULT 'Pending', duedate DATETIME NULL, createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updatedat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_task_owner(username), INDEX idx_task_status(status), CONSTRAINT fk_task_owner FOREIGN KEY (username) REFERENCES `register`(username) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    await dbPool.query("CREATE TABLE IF NOT EXISTS task_shares (taskid BIGINT UNSIGNED NOT NULL, sharedwith VARCHAR(40) NOT NULL, permission ENUM('Viewer','Editor') NOT NULL DEFAULT 'Viewer', sharedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(taskid,sharedwith), INDEX idx_shared_user(sharedwith), CONSTRAINT fk_share_task FOREIGN KEY(taskid) REFERENCES tasks(taskid) ON DELETE CASCADE, CONSTRAINT fk_share_user FOREIGN KEY(sharedwith) REFERENCES `register`(username) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    await dbPool.query("CREATE TABLE IF NOT EXISTS task_comments (commentid BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY, taskid BIGINT UNSIGNED NOT NULL, username VARCHAR(40) NOT NULL, commenttext TEXT NOT NULL, createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_comment_task(taskid), CONSTRAINT fk_comment_task FOREIGN KEY(taskid) REFERENCES tasks(taskid) ON DELETE CASCADE, CONSTRAINT fk_comment_user FOREIGN KEY(username) REFERENCES `register`(username) ON DELETE CASCADE) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  })();
  schemaReady.then(() => console.log("Task Manager tables ready"), e => console.error("Task schema error:", e.message));
  const statuses = ["Pending","In Progress","Completed"];
  const priorities = ["Low","Medium","High"];
  const idOf = raw => /^[1-9][0-9]*$/.test(String(raw)) && Number.isSafeInteger(Number(raw)) ? Number(raw) : null;
  const text = val => typeof val === "string" ? val.trim() : "";
  const canEdit = (task, username) => task.username === username || task.permission === "Editor";
  const isOwner = (task, username) => task.username === username;
  const errorPage = (res, message, status = 400) => res.status(status).render("task-error", {message});
  const ready = async (req,res,next) => { try { await schemaReady; next(); } catch(e) { console.error(e); errorPage(res,"Task database setup failed. Check DB permissions and application logs.",503); } };
  const access = async (taskid, username) => {
    const [rows] = await dbPool.execute("SELECT t.*, s.permission FROM tasks t LEFT JOIN task_shares s ON s.taskid=t.taskid AND s.sharedwith=? WHERE t.taskid=? AND (t.username=? OR s.sharedwith=?) LIMIT 1", [username,taskid,username,username]);
    return rows[0] || null;
  };
  const wrap = fn => (req,res,next) => Promise.resolve(fn(req,res)).catch(next);
  const csrf = (req,res) => sessionFor(req,res).csrf;
  const taskDate = value => {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) return undefined;
    return value.replace("T"," ") + ":00";
  };
  function taskValues(req) {
    const title = text(req.body.title), description = text(req.body.description);
    const status = text(req.body.status) || "Pending";
    const priority = text(req.body.priority) || "Medium";
    const duedate = taskDate(text(req.body.duedate));
    if (!title || title.length > 200 || description.length > 4000 || !statuses.includes(status) || !priorities.includes(priority) || duedate === undefined) return null;
    return {title,description,status,priority,duedate};
  }
  app.get("/tasks/shared", requireLogin, (req,res) => res.redirect("/tasks?view=shared"));
  app.get("/tasks", requireLogin, ready, wrap(async (req,res) => {
    const username=req.user.username;
    const [rows] = await dbPool.execute("SELECT t.*, s.permission, (SELECT COUNT(*) FROM task_comments c WHERE c.taskid=t.taskid) AS comment_count, (SELECT COUNT(*) FROM task_shares q WHERE q.taskid=t.taskid) AS share_count FROM tasks t LEFT JOIN task_shares s ON s.taskid=t.taskid AND s.sharedwith=? WHERE t.username=? OR s.sharedwith=? ORDER BY t.updatedat DESC, t.taskid DESC",[username,username,username]);
    const view=["mine","shared","all"].includes(req.query.view) ? req.query.view : "all";
    const status=statuses.includes(req.query.status) ? req.query.status : "";
    const priority=priorities.includes(req.query.priority) ? req.query.priority : "";
    const q=text(req.query.q).slice(0,120).toLowerCase();
    let tasks=rows.filter(t => (view==="all" || (view==="mine" ? t.username===username : t.username!==username)) && (!status || t.status===status) && (!priority || t.priority===priority) && (!q || (t.title+" "+(t.description||"")).toLowerCase().includes(q)));
    const sort=["updated","due","priority"].includes(req.query.sort) ? req.query.sort : "updated";
    if(sort==="due") tasks.sort((a,b) => (a.duedate ? new Date(a.duedate).getTime() : Number.MAX_SAFE_INTEGER) - (b.duedate ? new Date(b.duedate).getTime() : Number.MAX_SAFE_INTEGER));
    if(sort==="priority") tasks.sort((a,b) => priorities.indexOf(b.priority)-priorities.indexOf(a.priority));
    const counts={total:rows.length,mine:rows.filter(t=>t.username===username).length,shared:rows.filter(t=>t.username!==username).length,pending:rows.filter(t=>t.status==="Pending").length,completed:rows.filter(t=>t.status==="Completed").length};
    res.render("task-dashboard",{tasks,counts,user:req.user,view,status,priority,q,sort,csrf:csrf(req,res)});
  }));
  app.get("/tasks/new", requireLogin, ready, (req,res) => res.render("task-form",{task:null,csrf:csrf(req,res),error:null}));
  app.post("/tasks/new", requireLogin, csrfCheck, ready, wrap(async (req,res) => {
    const v=taskValues(req);
    if (!v) return res.status(400).render("task-form",{task:req.body,csrf:csrf(req,res),error:"Enter a title (up to 200 characters), valid priority/status, and optional date."});
    const [result] = await dbPool.execute("INSERT INTO tasks (username,title,description,priority,status,duedate) VALUES (?,?,?,?,?,?)",[req.user.username,v.title,v.description,v.priority,v.status,v.duedate]);
    res.redirect("/tasks/"+result.insertId);
  }));
  // Static paths must be registered before dynamic /tasks/:id.
  app.get("/tasks/:id/edit", requireLogin, ready, wrap(async (req,res) => {
    const id=idOf(req.params.id); if(!id)return errorPage(res,"Invalid task ID.");
    const task=await access(id,req.user.username);
    if(!task)return errorPage(res,"Task not found or not shared with you.",404);
    if(!canEdit(task,req.user.username))return errorPage(res,"View-only access cannot edit tasks.",403);
    res.render("task-form",{task,csrf:csrf(req,res),error:null});
  }));
  app.post("/tasks/:id/edit", requireLogin, csrfCheck, ready, wrap(async (req,res) => {
    const id=idOf(req.params.id); if(!id)return errorPage(res,"Invalid task ID.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found.",404);
    if(!canEdit(task,req.user.username))return errorPage(res,"View-only access.",403);
    const v=taskValues(req);if(!v)return res.status(400).render("task-form",{task:{...task,...req.body},csrf:csrf(req,res),error:"Please correct the task details."});
    await dbPool.execute("UPDATE tasks SET title=?,description=?,priority=?,status=?,duedate=? WHERE taskid=?",[v.title,v.description,v.priority,v.status,v.duedate,id]);
    res.redirect("/tasks/"+id);
  }));
  app.post("/tasks/:id/delete",requireLogin,csrfCheck,ready,wrap(async(req,res)=>{
    const id=idOf(req.params.id);if(!id)return errorPage(res,"Invalid task ID.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found.",404);
    if(!isOwner(task,req.user.username))return errorPage(res,"Only the owner can delete a task.",403);
    await dbPool.execute("DELETE FROM tasks WHERE taskid=? AND username=?",[id,req.user.username]);res.redirect("/tasks");
  }));
  app.post("/tasks/:id/status",requireLogin,csrfCheck,ready,wrap(async(req,res)=>{
    const id=idOf(req.params.id), status=text(req.body.status);if(!id||!statuses.includes(status))return errorPage(res,"Invalid task or status.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found.",404);
    if(!canEdit(task,req.user.username))return errorPage(res,"View-only access.",403);
    await dbPool.execute("UPDATE tasks SET status=? WHERE taskid=?",[status,id]);res.redirect("/tasks/"+id);
  }));
  app.post("/tasks/:id/comments",requireLogin,csrfCheck,ready,wrap(async(req,res)=>{
    const id=idOf(req.params.id), comment=text(req.body.commenttext);
    if(!id||!comment||comment.length>2000)return errorPage(res,"Comment must contain 1–2000 characters.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found.",404);
    await dbPool.execute("INSERT INTO task_comments(taskid,username,commenttext) VALUES(?,?,?)",[id,req.user.username,comment]);
    res.redirect("/tasks/"+id+"#comments");
  }));
  app.post("/tasks/:id/comments/:commentId/delete",requireLogin,csrfCheck,ready,wrap(async(req,res)=>{
    const id=idOf(req.params.id),commentid=idOf(req.params.commentId);if(!id||!commentid)return errorPage(res,"Invalid ID.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found.",404);
    const [r]=await dbPool.execute("SELECT username FROM task_comments WHERE taskid=? AND commentid=?",[id,commentid]);
    if(!r.length)return errorPage(res,"Comment not found.",404);
    if(r[0].username!==req.user.username && !isOwner(task,req.user.username))return errorPage(res,"Only the author or task owner can delete this comment.",403);
    await dbPool.execute("DELETE FROM task_comments WHERE taskid=? AND commentid=?",[id,commentid]);res.redirect("/tasks/"+id+"#comments");
  }));
  app.post("/tasks/:id/share",requireLogin,csrfCheck,ready,wrap(async(req,res)=>{
    const id=idOf(req.params.id),sharedwith=text(req.body.sharedwith),permission=text(req.body.permission);
    if(!id||!/^[A-Za-z0-9_]{3,40}$/.test(sharedwith)||!["Viewer","Editor"].includes(permission))return errorPage(res,"Enter a valid registered username and permission.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found.",404);
    if(!isOwner(task,req.user.username))return errorPage(res,"Only the owner can share tasks.",403);
    if(sharedwith===req.user.username)return errorPage(res,"You already own this task.");
    const [users]=await dbPool.execute("SELECT username FROM `register` WHERE username=? LIMIT 1",[sharedwith]);
    if(!users.length)return errorPage(res,"This username is not registered.",404);
    await dbPool.execute("INSERT INTO task_shares(taskid,sharedwith,permission) VALUES(?,?,?) ON DUPLICATE KEY UPDATE permission=VALUES(permission)",[id,sharedwith,permission]);
    res.redirect("/tasks/"+id+"#sharing");
  }));
  app.post("/tasks/:id/unshare",requireLogin,csrfCheck,ready,wrap(async(req,res)=>{
    const id=idOf(req.params.id),sharedwith=text(req.body.sharedwith);if(!id||!sharedwith)return errorPage(res,"Invalid request.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found.",404);
    if(!isOwner(task,req.user.username))return errorPage(res,"Only the owner can revoke sharing.",403);
    await dbPool.execute("DELETE FROM task_shares WHERE taskid=? AND sharedwith=?",[id,sharedwith]);res.redirect("/tasks/"+id+"#sharing");
  }));
  app.get("/tasks/:id",requireLogin,ready,wrap(async(req,res)=>{
    const id=idOf(req.params.id);if(!id)return errorPage(res,"Invalid task ID.");
    const task=await access(id,req.user.username);if(!task)return errorPage(res,"Task not found or not shared with you.",404);
    const [comments]=await dbPool.execute("SELECT c.commentid,c.username,c.commenttext,c.createdat,r.name FROM task_comments c JOIN `register` r ON r.username=c.username WHERE c.taskid=? ORDER BY c.createdat,c.commentid",[id]);
    const [shares]=await dbPool.execute("SELECT s.sharedwith,s.permission,s.sharedat,r.name FROM task_shares s JOIN `register` r ON r.username=s.sharedwith WHERE s.taskid=? ORDER BY s.sharedat",[id]);
    res.render("task-detail",{task,comments,shares,user:req.user,owner:isOwner(task,req.user.username),editor:canEdit(task,req.user.username),csrf:csrf(req,res)});
  }));
  // Forward asynchronous failures to a local error view, without leaking SQL.
  app.use((err,req,res,next)=>{if(!req.path.startsWith("/tasks"))return next(err); console.error("Task Manager error:",err.message); if(res.headersSent)return next(err);errorPage(res,"Unable to process this task request. Check database connectivity.",500);});
}
module.exports={installTasks};
