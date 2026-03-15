// JavaScript Online Compiler (версия с Monaco Editor)
// ------------------------------------------------------------
// Реализовано по требованиям:
// - Monaco Editor (редактор из VS Code) через CDN
// - Подсветка синтаксиса JavaScript + тёмная тема VS Code
// - Кнопка Run выполняет код через eval()
// - Вывод console.log идёт в панель Output

const outputEl = document.getElementById("output");
const runBtn = document.getElementById("runBtn");
const clearBtn = document.getElementById("clearBtn");
const editorContainer = document.getElementById("editor");

// Экземпляр Monaco Editor (создаётся после загрузки).
let editor = null;

// Начинаем перехватывать логи только после первого Run, чтобы не ловить лишние сообщения библиотек.
let captureEnabled = false;

const DEFAULT_CODE = `function hello() {
console.log("Hello from compiler");
}

hello();
`;

// Очищает панель вывода.
function clearOutput() {
  outputEl.textContent = "";
}

// Добавляет строку в панель вывода.
// Используем textContent, чтобы избежать HTML-инъекций.
function appendLine(line) {
  outputEl.textContent += `${line}\n`;
  outputEl.scrollTop = outputEl.scrollHeight;
}

// Приводит значения из console.log к читаемому тексту.
function formatValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || value === null || value === undefined) {
    return String(value);
  }
  if (value instanceof Error) return value.stack || value.message;

  // JSON для объектов (с обработкой циклических ссылок).
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) return "[Circular]";
          seen.add(val);
        }
        return val;
      },
      2,
    );
  } catch {
    // Фолбэк, если значение не сериализуется.
    return Object.prototype.toString.call(value);
  }
}

// Перехватываем console.log и пишем в Output.
const originalConsoleLog = console.log.bind(console);
console.log = (...args) => {
  // Не выводим в консоль браузера (требование проекта).
  // Если нужно дублировать в DevTools — раскомментируйте:
  // originalConsoleLog(...args);

  if (!captureEnabled) return;
  const message = args.map(formatValue).join(" ");
  appendLine(message);
};

// Запускает код из Monaco Editor через eval().
function run() {
  clearOutput();
  captureEnabled = true;

  if (!editor) {
    appendLine("[Editor is still loading...]");
    return;
  }

  const userCode = editor.getValue();

  try {
    // eval выполняет код в текущем контексте.
    // Это сделано намеренно (по требованиям задания).
    // Никогда не используйте eval для непроверенного кода в реальных приложениях.
    eval(userCode);
  } catch (err) {
    appendLine("[Error]");
    appendLine(formatValue(err));
  }
}

runBtn.addEventListener("click", run);
clearBtn.addEventListener("click", clearOutput);

// Отключаем Run, пока Monaco не загрузилась.
runBtn.disabled = true;

// Загрузка Monaco Editor (через CDN + AMD loader)
const MONACO_VERSION = "0.52.0";
const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/`;

function initMonaco() {
  if (typeof require === "undefined") {
    // Если CDN не загрузился — показываем понятную ошибку.
    runBtn.disabled = false;
    appendLine("[Error] Monaco loader (require.js) was not loaded.");
    return;
  }

  // Помогает Monaco загружать Web Worker'ы с CDN (без проблем с origin).
  window.MonacoEnvironment = {
    getWorkerUrl() {
      const workerMain = `${MONACO_BASE}vs/base/worker/workerMain.js`;
      const proxySource = `
        self.MonacoEnvironment = { baseUrl: '${MONACO_BASE}' };
        importScripts('${workerMain}');
      `;
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(proxySource)}`;
    },
  };

  require.config({ paths: { vs: `${MONACO_BASE}vs` } });

  require(["vs/editor/editor.main"], () => {
    editor = monaco.editor.create(editorContainer, {
      value: DEFAULT_CODE,
      language: "javascript",
      theme: "vs-dark", // Тёмная тема VS Code

      // Опции в стиле мини-IDE
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily:
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      lineNumbers: "on",
      scrollBeyondLastLine: false,
      renderLineHighlight: "line",
      roundedSelection: false,
      autoIndent: "full",
    });

    // Настройки отступов задаются у модели.
    const model = editor.getModel();
    if (model) model.updateOptions({ tabSize: 2, insertSpaces: true });

    // Включаем Run и добавляем Ctrl/Cmd + Enter прямо в Monaco.
    runBtn.disabled = false;
    runBtn.title = "Ctrl/Cmd + Enter";
    editor.focus();

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, run);
  });
}

initMonaco();
