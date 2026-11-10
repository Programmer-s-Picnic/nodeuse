# NodeUse Task Manager V2 — System Design

Backend: Express.js + EJS + mysql2/promise. Host: https://snode.learnwithchampak.live/tasks

## ER diagram

```mermaid
erDiagram
    REGISTER ||--o{ TASKS : owns
    REGISTER ||--o{ TASK_SHARES : receives
    TASKS ||--o{ TASK_SHARES : shared_with
    REGISTER ||--o{ TASK_COMMENTS : authors
    TASKS ||--o{ TASK_COMMENTS : contains
    REGISTER {
        varchar username PK
        varchar name
        varchar password
    }
    TASKS {
        bigint taskid PK
        varchar username FK
        varchar title
        text description
        enum priority
        enum status
        datetime duedate
        timestamp createdat
        timestamp updatedat
    }
    TASK_SHARES {
        bigint taskid PK,FK
        varchar sharedwith PK,FK
        enum permission
        timestamp sharedat
    }
    TASK_COMMENTS {
        bigint commentid PK
        bigint taskid FK
        varchar username FK
        text commenttext
        timestamp createdat
    }
```

## DFD Level 0 — Context

```mermaid
flowchart LR
  Student["Registered student"] -->|"Login, task requests, comments"| Manager["NodeUse Task Manager"]
  Owner["Task owner"] -->|"Create, edit, share, revoke"| Manager
  Manager -->|"Tasks and confirmations"| Student
  Manager -->|"Updates and shared lists"| Owner
  Manager <-->|"SQL read and write"| DB[("MySQL")]
```

## DFD Level 1 — Processes and stores

```mermaid
flowchart TD
  U["Student / task owner"]
  P1["1. Authenticate user"]
  P2["2. Manage tasks"]
  P3["3. Manage sharing and permissions"]
  P4["4. Manage comments"]
  P5["5. Search, filter and summarize"]
  D1[("D1: register")]
  D2[("D2: tasks")]
  D3[("D3: task_shares")]
  D4[("D4: task_comments")]
  U --> P1
  P1 <-->|"Credentials"| D1
  P1 -->|"Session identity"| P2
  P1 -->|"Session identity"| P3
  P1 -->|"Session identity"| P4
  U <-->|"Create, edit, complete and delete"| P2
  P2 <-->|"Owned tasks"| D2
  U <-->|"Share, permission, revoke"| P3
  P3 <-->|"Task ownership"| D2
  P3 <-->|"Share records"| D3
  P3 <-->|"Registered recipients"| D1
  U <-->|"Post, view, delete comments"| P4
  P4 <-->|"Comment records"| D4
  P4 <-->|"Access checks"| D2
  P4 <-->|"Access checks"| D3
  U <-->|"Search, filter, counts"| P5
  P5 --> D2
  P5 --> D3
  P5 --> D4
```

## Access policy

- Owner: view, edit, change status, share, revoke, delete, comment, moderate comments.
- Editor: view, edit, change status, comment and remove own comments.
- Viewer: view, comment and remove own comments.
- A user without access gets a 404 for private tasks.
- Deleting a task cascades to comments and sharing rows.
- A registered username is required for sharing.
- Use POST + CSRF for task mutations, and parameterized SQL for data values.

## Demo routes

- GET /tasks — dashboard, filters, search and statistics
- GET/POST /tasks/new — create task
- GET /tasks/:id — details, sharing and comments
- GET/POST /tasks/:id/edit — edit
- POST /tasks/:id/status — change status
- POST /tasks/:id/delete — owner-only delete
- POST /tasks/:id/share — owner-only share or change permission
- POST /tasks/:id/unshare — owner-only revoke
- POST /tasks/:id/comments — add comment
- POST /tasks/:id/comments/:commentId/delete — author or owner deletes
- GET /tasks/shared — redirects to shared filter

## Deployment

GoDaddy Airo is connected to the `main` branch of the NodeUse repository. Select Update Preview and Publish to Live. The MySQL account needs CREATE TABLE and foreign-key permissions. Verify with two registered demo accounts, then test cross-user access. The teaching registration system stores plaintext passwords; do not use real passwords.
