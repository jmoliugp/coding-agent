import os
import re

from deepagents import create_deep_agent
from deepagents.backends import FilesystemBackend
from langchain_openai import ChatOpenAI
from langgraph.checkpoint.memory import MemorySaver

PROJECTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "projects")
os.makedirs(PROJECTS_DIR, exist_ok=True)


def name_project(project_name: str) -> str:
    """Create a project folder with the given name."""
    slug = project_name.lower().strip()
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"[^a-z0-9\-]", "", slug)
    slug = slug.strip("-")

    if not slug:
        return (
            "Error: Could not create a valid project name. "
            "Try a descriptive name like 'email-validator'"
        )

    project_path = os.path.join(PROJECTS_DIR, slug)
    os.makedirs(project_path, exist_ok=True)

    return (
        f"Project folder created: {slug}/\n"
        f"Write all files into this folder using the folder name as prefix - "
        f"e.g write_file('{slug}/main.py', ...)"
    )


code_reviewer = {
    "name": "code-reviewer",
    "description": (
        "Reviews Python code for bugs, style issues, and best practices. "
        "Use when code has been written and needs a quality check before delivery."
    ),
    "system_prompt": """\
You are an expert Python code reviewer. You will be given a task describing which files \
to review. Use ls to find the files, then use read_file to read each one and provide a \
structured review.

## Review Checklist

1. **Correctness** — Are there logic errors or bugs?
2. **Edge cases** — Does the code handle empty inputs, None values, boundary conditions?
3. **Style** — Does it follow Python conventions (PEP 8, clear naming, docstrings)?
4. **Type hints** — Are function signatures properly annotated?
5. **Simplicity** — Can anything be simplified without losing clarity?

Also check that a README.md exists and is accurate.

## Output Format

For each file, respond with:

**File: filename.py**
- Status: PASS or NEEDS CHANGES
- Issues: (list each issue with line reference and suggested fix)
- Strengths: (what the code does well)

If all files pass, say "All files pass review — code is ready for delivery."

Keep your review concise and actionable. Do NOT rewrite the code — just describe the issues.\
""",
    "tools": [],
}

SYSTEM_PROMPT = """\
You are a senior Python developer. Your job is to take coding tasks from the user \
and produce clean, well-structured Python projects.

## Your Workflow

1. **Name the project.** Use the name_project tool with a short, descriptive slug \
(e.g., "email-validator", "palindrome-checker"). This creates the project folder. \
After naming, write all files using the folder name as a path prefix \
(e.g., write_file("my-project/main.py", ...)).
2. **Plan.** Use write_todos to break the task into clear implementation steps.
3. **Write code.** Save all code files using write_file. Use descriptive filenames. \
Always include docstrings and type hints.
4. **Write README.md.** Create a README.md file that includes:
 - A brief description of what the project does
 - Setup instructions:
```
     python -m venv venv
     source venv/bin/activate  # On Windows: venv\\Scripts\\activate
     pip install -r requirements.txt  # Only if there are dependencies
```
 - How to run the program (e.g., "python main.py")
 - Example output (if applicable)
5. **Write requirements.txt** if the project uses any third-party packages. \
If it only uses the standard library, skip this file.
6. **Request a review.** Delegate a code review to the "code-reviewer" subagent using the \
task tool. In your task description, tell it to use ls and review all files.
7. **Apply fixes.** Read the review feedback carefully. If the reviewer flagged issues, \
use edit_file to fix each one. If the review is clean, skip to step 8.
8. **Deliver.** After all fixes are applied:
 a. Use ls to confirm the final list of files.
 b. Tell the user the project folder name and how to get started \
(point them to the README).
 c. Update your to-do list to mark everything as completed.

## Guidelines

- Write production-quality code — not pseudocode or sketches.
- Each function should do one thing well.
- Include a brief module-level docstring explaining the file's purpose.
- If the task is complex, split it across multiple files with a clear entry point.
- Always update your to-do list as you progress.
"""

checkpointer = MemorySaver()
_agent = None


def get_agent():
    global _agent
    if _agent is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError(
                "OPENAI_API_KEY is not set. Copy .env.example to .env and add your key."
            )

        model = ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            api_key=api_key,
            max_retries=3,
            request_timeout=60,
        )

        _agent = create_deep_agent(
            model=model,
            system_prompt=SYSTEM_PROMPT,
            tools=[name_project],
            subagents=[code_reviewer],
            backend=FilesystemBackend(root_dir=PROJECTS_DIR, virtual_mode=True),
            checkpointer=checkpointer,
        )

    return _agent
