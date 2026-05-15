// FluxDesk VS Code Extension — Webview Script
// Vanilla JS, no bundler. Communicates with the extension host via acquireVsCodeApi().

(function () {
  'use strict';

  const vscode = acquireVsCodeApi();

  // ── Tool definitions (mirrors toolDefinitions.ts) ──────────────────────────
  const TOOLS = [
    {
      id: 'forge',
      name: 'PromptForge',
      description: 'Raw idea \u2192 structured framework prompt',
      fields: [
        { key: 'idea', label: 'Raw Idea', type: 'textarea', required: true, placeholder: 'Describe what you want the AI to do\u2026', primary: true },
        { key: 'category', label: 'Category (optional)', type: 'text', placeholder: 'e.g. coding, writing, analysis' },
        { key: 'targetAi', label: 'Target AI (optional)', type: 'text', placeholder: 'Claude, GPT-4, Gemini\u2026' },
        { key: 'framework', label: 'Framework override (optional)', type: 'text', placeholder: 'RISEN, CO-STAR, ReAct\u2026' },
      ],
    },
    {
      id: 'improver',
      name: 'Prompt Improver',
      description: 'Grade and rewrite any prompt',
      fields: [
        { key: 'prompt', label: 'Prompt to Improve', type: 'textarea', required: true, placeholder: 'Paste the prompt you want improved\u2026', primary: true },
        { key: 'context', label: 'Context / Purpose (optional)', type: 'text', placeholder: 'What is this prompt for?' },
      ],
    },
    {
      id: 'code-review',
      name: 'Code Review Brief',
      description: 'Code \u2192 structured review checklist',
      fields: [
        { key: 'code', label: 'Code', type: 'textarea', required: true, placeholder: 'Paste your code here\u2026', primary: true },
        { key: 'language', label: 'Language / Framework (optional)', type: 'text', placeholder: 'TypeScript, Python, React\u2026' },
        {
          key: 'focus', label: 'Focus (optional)', type: 'select',
          options: ['', 'general', 'security', 'performance', 'readability', 'tests', 'architecture'],
          optionLabels: ['Auto-detect', 'General', 'Security', 'Performance', 'Readability', 'Tests', 'Architecture'],
        },
      ],
    },
    {
      id: 'bug-task',
      name: 'Bug \u2192 Task',
      description: 'Messy report \u2192 clean structured ticket',
      fields: [
        { key: 'rawReport', label: 'Raw Bug Report', type: 'textarea', required: true, placeholder: 'Paste the raw bug report or Slack message\u2026', primary: true },
        { key: 'product', label: 'Product (optional)', type: 'text', placeholder: 'e.g. Dashboard, Mobile App' },
        {
          key: 'format', label: 'Ticket Format (optional)', type: 'select',
          options: ['', 'linear', 'jira', 'github', 'notion'],
          optionLabels: ['Auto', 'Linear', 'Jira', 'GitHub', 'Notion'],
        },
      ],
    },
    {
      id: 'commit',
      name: 'Commit Writer',
      description: 'Changes \u2192 conventional commit messages',
      fields: [
        { key: 'diff', label: 'Diff / Description', type: 'textarea', required: true, placeholder: 'Paste your git diff or describe what changed\u2026', primary: true },
        { key: 'scope', label: 'Scope (optional)', type: 'text', placeholder: 'e.g. auth, api, ui' },
        { key: 'typeHint', label: 'Type hint (optional)', type: 'text', placeholder: 'feat, fix, refactor\u2026' },
      ],
    },
    {
      id: 'feature-spec',
      name: 'Feature Spec',
      description: 'One-liner \u2192 full spec with user stories',
      fields: [
        { key: 'idea', label: 'Feature Idea', type: 'textarea', required: true, placeholder: 'Describe the feature in 1\u20133 sentences\u2026', primary: true },
        { key: 'product', label: 'Product (optional)', type: 'text', placeholder: 'e.g. FluxDesk, Mobile App' },
        {
          key: 'audience', label: 'Audience (optional)', type: 'select',
          options: ['', 'team', 'pm', 'stakeholder', 'designer'],
          optionLabels: ['Auto', 'Engineering Team', 'Product Manager', 'Stakeholder', 'Designer'],
        },
      ],
    },
    {
      id: 'standup',
      name: 'Standup Writer',
      description: 'Bullets \u2192 polished Slack standup',
      fields: [
        { key: 'yesterday', label: 'Yesterday', type: 'textarea', required: false, placeholder: 'What did you work on yesterday?' },
        { key: 'today', label: 'Today', type: 'textarea', required: false, placeholder: 'What will you work on today?' },
        { key: 'blockers', label: 'Blockers (optional)', type: 'text', placeholder: 'Any blockers?' },
        { key: 'team', label: 'Channel / Team (optional)', type: 'text', placeholder: '#general, #engineering\u2026' },
        {
          key: 'tone', label: 'Tone (optional)', type: 'select',
          options: ['', 'concise', 'detailed', 'casual'],
          optionLabels: ['Default', 'Concise', 'Detailed', 'Casual'],
        },
      ],
    },
    {
      id: 'adr',
      name: 'ADR Generator',
      description: 'Decision context \u2192 Architecture Decision Record',
      fields: [
        { key: 'decision', label: 'Decision to Document', type: 'textarea', required: true, placeholder: 'What decision are you making?', primary: true },
        { key: 'context', label: 'Context (optional)', type: 'textarea', placeholder: 'What situation led to this decision?' },
        { key: 'options', label: 'Options Considered (optional)', type: 'textarea', placeholder: 'List the options, one per line' },
      ],
    },
    {
      id: 'tech-stack',
      name: 'Tech Stack Advisor',
      description: 'Constraints \u2192 reasoned stack recommendation',
      fields: [
        { key: 'projectType', label: 'Project Type', type: 'textarea', required: true, placeholder: 'e.g. Real-time SaaS dashboard with complex auth, team of 3', primary: true },
        { key: 'teamSize', label: 'Team Size (optional)', type: 'text', placeholder: 'e.g. Solo, 3 devs, 10-person team' },
        { key: 'timeline', label: 'Timeline (optional)', type: 'text', placeholder: 'e.g. MVP in 6 weeks' },
        { key: 'constraints', label: 'Constraints (optional)', type: 'textarea', placeholder: 'Budget, must use existing infra, no vendor lock-in\u2026' },
      ],
    },
    {
      id: 'concept-explainer',
      name: 'Concept Explainer',
      description: 'Concept \u2192 multi-level explanation',
      fields: [
        { key: 'concept', label: 'Concept', type: 'text', required: true, placeholder: 'e.g. React reconciliation, TCP handshake, monads', primary: true },
        {
          key: 'level', label: 'Explanation Level (optional)', type: 'select',
          options: ['', 'eli5', 'beginner', 'intermediate', 'advanced', 'expert'],
          optionLabels: ['Auto', 'ELI5', 'Beginner', 'Intermediate', 'Advanced', 'Expert'],
        },
      ],
    },
    {
      id: 'flashcards',
      name: 'Flashcard Factory',
      description: 'Text / docs \u2192 spaced-repetition flashcards',
      fields: [
        { key: 'content', label: 'Source Material', type: 'textarea', required: true, placeholder: 'Paste the text or documentation to generate flashcards from\u2026', primary: true },
        { key: 'count', label: 'Number of Cards (optional)', type: 'number', placeholder: '8', min: 3, max: 20 },
        {
          key: 'style', label: 'Card Style (optional)', type: 'select',
          options: ['', 'qa', 'cloze', 'concept'],
          optionLabels: ['Default', 'Q&A', 'Cloze deletion', 'Concept'],
        },
      ],
    },
    {
      id: 'compare',
      name: 'Model Comparator',
      description: 'Prompt \u2192 comparison across AI models',
      fields: [
        { key: 'prompt', label: 'Prompt to Compare', type: 'textarea', required: true, placeholder: 'Paste the prompt you want compared across models\u2026', primary: true },
        { key: 'context', label: 'Context (optional)', type: 'text', placeholder: 'Any additional context for the comparison' },
      ],
    },
  ];

  // ── State ──────────────────────────────────────────────────────────────────
  let state = {
    authenticated: false,
    selectedToolId: TOOLS[0].id,
    loading: false,
    output: null,          // string | null
    error: null,           // string | null
    prefillPending: null,  // { toolId, text, language } | null
  };

  // ── DOM root ───────────────────────────────────────────────────────────────
  const root = document.getElementById('root');

  // ── Render ─────────────────────────────────────────────────────────────────
  function render() {
    root.textContent = '';
    if (!state.authenticated) {
      root.appendChild(buildAuthScreen());
    } else {
      root.appendChild(buildToolScreen());
    }
  }

  // ─── Auth screen ────────────────────────────────────────────────────────────
  function buildAuthScreen() {
    const wrap = makeEl('div', 'screen auth-screen');

    const logo = makeEl('div', 'logo');
    logo.textContent = 'FluxDesk';
    wrap.appendChild(logo);

    const tagline = makeEl('p', 'tagline');
    tagline.textContent = 'AI dev toolkit for VS Code';
    wrap.appendChild(tagline);

    wrap.appendChild(makeEl('div', 'sep'));

    const label = makeEl('label', 'field-label');
    label.textContent = 'API Token';
    label.htmlFor = 'token-input';
    wrap.appendChild(label);

    const hint = makeEl('p', 'field-hint');
    hint.textContent = 'Get your JWT from the FluxDesk web app \u2192 Profile \u2192 API Token.';
    wrap.appendChild(hint);

    const tokenInput = makeEl('input', 'input');
    tokenInput.id = 'token-input';
    tokenInput.type = 'password';
    tokenInput.placeholder = 'Paste your JWT here\u2026';
    wrap.appendChild(tokenInput);

    if (state.error) {
      wrap.appendChild(buildErrorBox(state.error));
    }

    const btn = makeEl('button', 'btn btn-primary');
    btn.id = 'save-token-btn';
    btn.textContent = 'Connect';
    btn.addEventListener('click', () => {
      const token = tokenInput.value.trim();
      if (!token) return;
      state.error = null;
      btn.disabled = true;
      btn.textContent = 'Verifying\u2026';
      vscode.postMessage({ type: 'saveToken', token });
    });
    wrap.appendChild(btn);

    tokenInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn.click();
    });

    return wrap;
  }

  // ─── Tool screen ────────────────────────────────────────────────────────────
  function buildToolScreen() {
    const wrap = makeEl('div', 'screen tool-screen');

    // Header row
    const header = makeEl('div', 'header');

    const logoSmall = makeEl('span', 'logo-small');
    logoSmall.textContent = 'FluxDesk';
    header.appendChild(logoSmall);

    const logoutBtn = makeEl('button', 'btn-icon');
    logoutBtn.title = 'Sign out';
    logoutBtn.textContent = '\u2715'; // multiplication sign as close icon
    logoutBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'clearToken' });
    });
    header.appendChild(logoutBtn);
    wrap.appendChild(header);

    // Tool picker
    const pickerLabel = makeEl('label', 'field-label');
    pickerLabel.textContent = 'Tool';
    pickerLabel.htmlFor = 'tool-picker';
    wrap.appendChild(pickerLabel);

    const picker = makeEl('select', 'select');
    picker.id = 'tool-picker';
    TOOLS.forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.name;
      if (t.id === state.selectedToolId) opt.selected = true;
      picker.appendChild(opt);
    });
    picker.addEventListener('change', () => {
      state.selectedToolId = picker.value;
      state.output = null;
      state.error = null;
      renderForm();
    });
    wrap.appendChild(picker);

    // Tool description
    const descEl = makeEl('p', 'tool-desc');
    descEl.id = 'tool-desc';
    wrap.appendChild(descEl);

    // Form container
    const formWrap = makeEl('div', '');
    formWrap.id = 'form-wrap';
    wrap.appendChild(formWrap);

    // Use selection button
    const selBtn = makeEl('button', 'btn btn-secondary');
    selBtn.id = 'sel-btn';
    selBtn.textContent = 'Use editor selection';
    selBtn.addEventListener('click', () => {
      vscode.postMessage({ type: 'getSelection' });
    });
    wrap.appendChild(selBtn);

    // Error area
    const errorWrap = makeEl('div', '');
    errorWrap.id = 'error-wrap';
    wrap.appendChild(errorWrap);

    // Submit button
    const submitBtn = makeEl('button', 'btn btn-primary');
    submitBtn.id = 'submit-btn';
    submitBtn.textContent = state.loading ? 'Running\u2026' : 'Run';
    submitBtn.disabled = state.loading;
    submitBtn.addEventListener('click', handleSubmit);
    wrap.appendChild(submitBtn);

    // Output area
    const outputWrap = makeEl('div', '');
    outputWrap.id = 'output-wrap';
    wrap.appendChild(outputWrap);

    renderForm();
    return wrap;
  }

  function renderForm() {
    const tool = TOOLS.find((t) => t.id === state.selectedToolId) || TOOLS[0];

    const descEl = document.getElementById('tool-desc');
    if (descEl) descEl.textContent = tool.description;

    const formWrap = document.getElementById('form-wrap');
    if (!formWrap) return;
    formWrap.textContent = '';

    tool.fields.forEach((field) => {
      const group = makeEl('div', 'field-group');

      const label = makeEl('label', 'field-label');
      label.textContent = field.label;
      label.htmlFor = 'field-' + field.key;
      group.appendChild(label);

      let input;
      if (field.type === 'textarea') {
        input = makeEl('textarea', 'textarea');
        input.id = 'field-' + field.key;
        input.placeholder = field.placeholder || '';
        input.rows = field.primary ? 6 : 3;
        input.setAttribute('data-key', field.key);
      } else if (field.type === 'select') {
        input = makeEl('select', 'select');
        input.id = 'field-' + field.key;
        input.setAttribute('data-key', field.key);
        (field.options || []).forEach((opt, i) => {
          const optEl = document.createElement('option');
          optEl.value = opt;
          optEl.textContent = (field.optionLabels || [])[i] || opt;
          input.appendChild(optEl);
        });
      } else if (field.type === 'number') {
        input = makeEl('input', 'input');
        input.id = 'field-' + field.key;
        input.type = 'number';
        input.placeholder = field.placeholder || '';
        input.min = String(field.min || 1);
        input.max = String(field.max || 100);
        input.setAttribute('data-key', field.key);
      } else {
        input = makeEl('input', 'input');
        input.id = 'field-' + field.key;
        input.type = 'text';
        input.placeholder = field.placeholder || '';
        input.setAttribute('data-key', field.key);
      }

      group.appendChild(input);
      formWrap.appendChild(group);
    });

    // Sync submit button state
    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = state.loading;
      submitBtn.textContent = state.loading ? 'Running\u2026' : 'Run';
    }

    // Sync error
    const errorWrap = document.getElementById('error-wrap');
    if (errorWrap) {
      errorWrap.textContent = '';
      if (state.error) errorWrap.appendChild(buildErrorBox(state.error));
    }

    renderOutput();
  }

  function renderOutput() {
    const outputWrap = document.getElementById('output-wrap');
    if (!outputWrap) return;
    outputWrap.textContent = '';

    if (!state.output) return;

    const card = makeEl('div', 'output-card');

    const outputHeader = makeEl('div', 'output-header');

    const outputLabel = makeEl('span', 'output-label');
    outputLabel.textContent = 'Output';
    outputHeader.appendChild(outputLabel);

    const actions = makeEl('div', 'output-actions');

    const copyBtn = makeEl('button', 'btn btn-secondary btn-sm');
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      const text = state.output;
      if (!text) return;
      navigator.clipboard.writeText(text).then(() => {
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      }).catch(() => {
        // Fallback: select content of the pre element
        const pre = outputWrap.querySelector('pre');
        if (pre) {
          const range = document.createRange();
          range.selectNode(pre);
          const sel = window.getSelection();
          if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
      });
    });
    actions.appendChild(copyBtn);

    const insertBtn = makeEl('button', 'btn btn-secondary btn-sm');
    insertBtn.textContent = 'Insert at cursor';
    insertBtn.addEventListener('click', () => {
      if (state.output) {
        vscode.postMessage({ type: 'insertText', text: state.output });
      }
    });
    actions.appendChild(insertBtn);

    outputHeader.appendChild(actions);
    card.appendChild(outputHeader);

    const contentDiv = makeEl('div', 'output-content');
    contentDiv.appendChild(renderMarkdown(state.output));
    card.appendChild(contentDiv);

    outputWrap.appendChild(card);
  }

  // ─── Markdown renderer ─────────────────────────────────────────────────────────
  // Zero external dependencies. Converts backend API output to safe DOM nodes.
  // Content comes from the authenticated FluxDesk backend API (not user input).
  // Builds real DOM nodes instead of string manipulation.
  function renderMarkdown(text) {
    var fragment = document.createDocumentFragment();
    var rawBlocks = text.split(/\n{2,}/);

    rawBlocks.forEach(function (block) {
      block = block.trim();
      if (!block) return;

      // Fenced code block: ```lang\n...\n```
      var codeMatch = block.match(/^```(\w*)\n([\s\S]*?)```$/);
      if (codeMatch) {
        var pre = document.createElement('pre');
        var code = document.createElement('code');
        if (codeMatch[1]) code.className = codeMatch[1];
        code.textContent = codeMatch[2];
        pre.appendChild(code);
        fragment.appendChild(pre);
        return;
      }

      // Horizontal rule
      if (/^---+$/.test(block)) {
        fragment.appendChild(document.createElement('hr'));
        return;
      }

      // Headings h1–h3
      var hMatch = block.match(/^(#{1,3})\s+(.*)/);
      if (hMatch) {
        var level = hMatch[1].length;
        var h = document.createElement('h' + level);
        applyInlineMarkdown(h, hMatch[2]);
        fragment.appendChild(h);
        return;
      }

      // Unordered list
      if (/^[-*]\s/.test(block)) {
        var ul = document.createElement('ul');
        block.split('\n').forEach(function (line) {
          var m = line.match(/^[-*]\s+(.*)/);
          if (m) {
            var li = document.createElement('li');
            applyInlineMarkdown(li, m[1]);
            ul.appendChild(li);
          }
        });
        fragment.appendChild(ul);
        return;
      }

      // Ordered list
      if (/^\d+\.\s/.test(block)) {
        var ol = document.createElement('ol');
        block.split('\n').forEach(function (line) {
          var m = line.match(/^\d+\.\s+(.*)/);
          if (m) {
            var li = document.createElement('li');
            applyInlineMarkdown(li, m[1]);
            ol.appendChild(li);
          }
        });
        fragment.appendChild(ol);
        return;
      }

      // Paragraph
      var p = document.createElement('p');
      applyInlineMarkdown(p, block.replace(/\n/g, ' '));
      fragment.appendChild(p);
    });

    return fragment;
  }

  // Applies bold, italic, inline code to a parent element using real DOM nodes.
  function applyInlineMarkdown(parent, text) {
    var parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    parts.forEach(function (part) {
      if (/^\*\*(.+)\*\*$/.test(part)) {
        var strong = document.createElement('strong');
        strong.textContent = part.slice(2, -2);
        parent.appendChild(strong);
      } else if (/^\*(.+)\*$/.test(part)) {
        var em = document.createElement('em');
        em.textContent = part.slice(1, -1);
        parent.appendChild(em);
      } else if (/^`(.+)`$/.test(part)) {
        var code = document.createElement('code');
        code.textContent = part.slice(1, -1);
        parent.appendChild(code);
      } else {
        parent.appendChild(document.createTextNode(part));
      }
    });
  }

  // ─── Submit ─────────────────────────────────────────────────────────────────
  function handleSubmit() {
    const tool = TOOLS.find((t) => t.id === state.selectedToolId);
    if (!tool) return;

    const inputs = {};
    let hasError = false;

    tool.fields.forEach((field) => {
      const inputEl = document.getElementById('field-' + field.key);
      if (!inputEl) return;

      const rawValue = inputEl.value;

      if (field.type === 'number') {
        const num = parseInt(rawValue, 10);
        if (!isNaN(num)) {
          inputs[field.key] = num;
        } else if (field.required) {
          hasError = true;
        }
      } else {
        const value = rawValue.trim();
        if (value) {
          inputs[field.key] = value;
        } else if (field.required) {
          hasError = true;
        }
      }
    });

    if (hasError) {
      state.error = 'Please fill in the required fields.';
      const errorWrap = document.getElementById('error-wrap');
      if (errorWrap) {
        errorWrap.textContent = '';
        errorWrap.appendChild(buildErrorBox(state.error));
      }
      return;
    }

    state.error = null;
    state.loading = true;
    state.output = null;

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Running\u2026';
    }

    const errorWrap = document.getElementById('error-wrap');
    if (errorWrap) errorWrap.textContent = '';

    renderOutput();

    vscode.postMessage({ type: 'callTool', toolId: tool.id, inputs });
  }

  // ─── Message handler ────────────────────────────────────────────────────────
  window.addEventListener('message', (event) => {
    const msg = event.data;

    switch (msg.type) {
      case 'authState':
        state.authenticated = Boolean(msg.authenticated);
        state.error = null;
        render();
        if (state.authenticated && state.prefillPending) {
          const pending = state.prefillPending;
          state.prefillPending = null;
          applyPrefill(pending.toolId, pending.text, pending.language);
        }
        break;

      case 'error':
        state.loading = false;
        state.error = String(msg.message || 'Unknown error');
        if (state.authenticated) {
          const errorWrap = document.getElementById('error-wrap');
          if (errorWrap) {
            errorWrap.textContent = '';
            errorWrap.appendChild(buildErrorBox(state.error));
          }
          const submitBtn = document.getElementById('submit-btn');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Run';
          }
        } else {
          render();
        }
        break;

      case 'result':
        state.loading = false;
        state.output = typeof msg.output === 'string' ? msg.output : '';
        state.error = null;
        {
          const submitBtn = document.getElementById('submit-btn');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Run';
          }
        }
        renderOutput();
        break;

      case 'selection':
        applySelectionToForm(
          typeof msg.text === 'string' ? msg.text : '',
          typeof msg.language === 'string' ? msg.language : ''
        );
        break;

      case 'prefill':
        if (!state.authenticated) {
          state.prefillPending = {
            toolId: msg.toolId,
            text: msg.text,
            language: msg.language,
          };
        } else {
          applyPrefill(msg.toolId, msg.text, msg.language);
        }
        break;
    }
  });

  // ─── Prefill helpers ────────────────────────────────────────────────────────
  function applyPrefill(toolId, text, language) {
    state.selectedToolId = toolId;
    state.output = null;
    state.error = null;

    const picker = document.getElementById('tool-picker');
    if (picker) picker.value = toolId;

    renderForm();

    const tool = TOOLS.find((t) => t.id === toolId);
    if (!tool) return;

    const primaryField = tool.fields.find((f) => f.primary) || tool.fields[0];
    if (primaryField) {
      const inputEl = document.getElementById('field-' + primaryField.key);
      if (inputEl) inputEl.value = text;
    }

    if (toolId === 'code-review' && language) {
      const langEl = document.getElementById('field-language');
      if (langEl && !langEl.value) langEl.value = language;
    }
  }

  function applySelectionToForm(text, language) {
    if (!text) return;
    const tool = TOOLS.find((t) => t.id === state.selectedToolId);
    if (!tool) return;

    const primaryField = tool.fields.find((f) => f.primary) || tool.fields[0];
    if (primaryField) {
      const inputEl = document.getElementById('field-' + primaryField.key);
      if (inputEl) inputEl.value = text;
    }

    if (state.selectedToolId === 'code-review' && language) {
      const langEl = document.getElementById('field-language');
      if (langEl && !langEl.value) langEl.value = language;
    }
  }

  // ─── DOM helper ─────────────────────────────────────────────────────────────
  function makeEl(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  function buildErrorBox(message) {
    const div = makeEl('div', 'error-box');
    div.textContent = message;
    return div;
  }

  // ── Boot ───────────────────────────────────────────────────────────────────
  render();
  vscode.postMessage({ type: 'ready' });
})();
