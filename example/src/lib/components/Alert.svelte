<script lang="ts">
  import { onMount } from "svelte";
  import X from "@lucide/svelte/icons/x";
  import Upload from "@lucide/svelte/icons/upload";
  import Search from "@lucide/svelte/icons/search";
  import Loader from "@lucide/svelte/icons/loader";
  import { fly } from "svelte/transition";
  import * as Dialog from "$lib/components/ui/dialog";
  import { Input } from "$lib/components/ui/input";
  import { Textarea } from "$lib/components/ui/textarea";
  import { Button } from "$lib/components/ui/button";

  type ToastType = "error" | "confirm" | "success" | "notification";
  type ModalType =
    | "confirm"
    | "prompt"
    | "form"
    | "select"
    | "file"
    | "loading"
    | "color"
    | "date";

  interface Toast {
    _id: number;
    msg: string;
    type: ToastType;
  }

  interface ConfirmModal {
    title: string;
    show: boolean;
    message: string;
    password: string;
    passwordInput: string;
    options: Record<string, unknown>;
    resolve: ((value: boolean) => void) | null;
  }

  interface PromptModal {
    title: string;
    show: boolean;
    question: string | string[];
    answer: string;
    options: Record<string, unknown>;
    resolve: ((value: string | string[] | null) => void) | null;
    isMulti: boolean;
    currentIndex: number;
    answers: string[];
  }

  interface FormField {
    name: string;
    type: string;
    label?: string;
    placeholder?: string;
    required?: boolean;
    options?: Array<string | { value: string; label: string }>;
    validation?: (value: unknown) => string | null;
    multiple?: boolean;
  }

  interface FormModal {
    title: string;
    show: boolean;
    fields: FormField[];
    data: Record<string, unknown>;
    errors: Record<string, string>;
    options: Record<string, unknown>;
    resolve: ((value: Record<string, unknown> | null) => void) | null;
  }

  interface SelectModal {
    title: string;
    show: boolean;
    options: Array<string | { value: string; label: string }>;
    config: Record<string, unknown>;
    value: string | string[];
    search: string;
    resolve: ((value: string | string[] | null) => void) | null;
  }

  interface FileModal {
    title: string;
    show: boolean;
    options: Record<string, unknown>;
    resolve: ((value: File[] | null) => void) | null;
    dragOver: boolean;
    selected: File[];
  }

  interface LoadingModal {
    title: string;
    show: boolean;
    message: string;
    progress: number;
    cancellable: boolean;
    cancelFn: (() => void) | null;
  }

  interface ColorModal {
    title: string;
    show: boolean;
    value: string;
    resolve: ((value: string | null) => void) | null;
  }

  interface DateModal {
    title: string;
    show: boolean;
    value: string;
    resolve: ((value: string | null) => void) | null;
  }

  interface ModalsState {
    confirm: ConfirmModal;
    prompt: PromptModal;
    form: FormModal;
    select: SelectModal;
    file: FileModal;
    loading: LoadingModal;
    color: ColorModal;
    date: DateModal;
  }

  let toasts: Toast[] = $state([]);
  let toastId = 0;
  let callback: (() => void) | null = null;

  let modals: ModalsState = $state({
    confirm: {
      title: "Confirm",
      show: false,
      message: "",
      password: "",
      passwordInput: "",
      resolve: null,
      options: {},
    },
    prompt: {
      title: "Prompt",
      show: false,
      question: "",
      answer: "",
      options: {},
      resolve: null,
      isMulti: false,
      currentIndex: 0,
      answers: [],
    },
    form: {
      title: "Form",
      show: false,
      fields: [],
      data: {},
      errors: {},
      options: {},
      resolve: null,
    },
    select: {
      title: "Select",
      show: false,
      options: [],
      config: {},
      value: [],
      search: "",
      resolve: null,
    },
    file: {
      title: "Upload Files",
      show: false,
      options: {},
      resolve: null,
      dragOver: false,
      selected: [],
    },
    loading: {
      title: "Loading",
      show: false,
      message: "",
      progress: 0,
      cancellable: false,
      cancelFn: null,
    },
    color: {
      title: "Pick a Color",
      show: false,
      value: "#3b82f6",
      resolve: null,
    },
    date: { title: "Select Date", show: false, value: "", resolve: null },
  });

  const toastClasses = {
    error: "bg-red-600/80 text-red-100 border-red-200/20 bg-blur-sm",
    confirm: "bg-blue-600/80 text-blue-100 border-blue-200/20 bg-blur-sm",
    success: "bg-green-600/80 text-green-100 border-green-200/20 bg-blur-sm",
    notification:
      "bg-yellow-500/80 text-yellow-100 border-yellow-200/20 bg-blur-sm",
  };

  export const alert = (
    msg = "",
    type: ToastType = "notification",
    autoHide = true,
    onClose: (() => void) | false = false,
    retainMs = type === "error" ? 8500 : 3500
  ) => {
    const _id = ++toastId;
    toasts = [...toasts, { _id, msg, type }];
    if (autoHide) setTimeout(() => removeToast(_id), retainMs);
    if (onClose) callback = onClose;
  };

  const removeToast = (_id: number) => {
    toasts = toasts.filter((a) => a._id !== _id);
    if (callback) {
      callback();
      callback = null;
    }
  };

  const openModal = <T,>(
    type: ModalType,
    config: Record<string, unknown>
  ): Promise<T> =>
    new Promise((resolve) =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.assign(modals[type], config, {
        show: true,
        resolve: resolve as any,
      })
    );

  const closeModal = (type: ModalType, value?: unknown) => {
    const modal = modals[type];
    modal.show = false;
    if ("resolve" in modal && modal.resolve) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (modal.resolve as any)(value);
      modal.resolve = null;
    }
  };

  const confirm = (
    msg: string,
    pw = "",
    options: Record<string, unknown> = {}
  ): Promise<boolean> =>
    openModal("confirm", {
      message: msg,
      password: pw,
      passwordInput: "",
      ...options,
    });

  const prompt = (
    question: string | string[],
    options: Record<string, unknown> = {}
  ): Promise<string | string[] | null> => {
    const isMulti = Array.isArray(question);
    return openModal("prompt", {
      question,
      answer: isMulti ? [] : "",
      answers: isMulti ? [] : undefined,
      options,
      isMulti,
      currentIndex: 0,
      ...options,
    });
  };

  const form = (
    fields: FormField[],
    options: Record<string, unknown> = {}
  ): Promise<Record<string, unknown> | null> => {
    const data: Record<string, unknown> = {};
    fields.forEach(
      (field) =>
        (data[field.name] =
          field.type === "checkbox"
            ? false
            : field.type === "file" && field.multiple
              ? []
              : "")
    );
    return openModal("form", { fields, data, errors: {}, options });
  };

  const select = (
    options: Array<string | { value: string; label: string }>,
    config: Record<string, unknown> = {}
  ): Promise<string[] | string | null> =>
    openModal("select", {
      options,
      config,
      value: (config as { multiple?: boolean }).multiple ? [] : "",
      search: "",
    });

  const uploadFile = (
    options: Record<string, unknown> = {}
  ): Promise<File[] | null> =>
    openModal("file", { options, dragOver: false, selected: [] });

  const loading = async (
    asyncFn: (updateProgress?: (progress: number) => void) => Promise<unknown>,
    options: string | Record<string, unknown> = {}
  ): Promise<unknown> => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise((resolve, reject) => {
      modals.loading = {
        ...modals.loading,
        message: (opts as { message?: string }).message || "Loading...",
        progress: 0,
        cancellable: (opts as { cancellable?: boolean }).cancellable || false,
        show: true,
      };

      let cancelled = false;
      modals.loading.cancelFn = () => {
        cancelled = true;
        modals.loading.show = false;
        reject(new Error("Cancelled"));
      };

      const updateProgress = (progress: number) => {
        if (!cancelled)
          modals.loading.progress = Math.max(0, Math.min(100, progress));
      };

      asyncFn(
        (opts as { progress?: boolean }).progress ? updateProgress : undefined
      )
        .then((result) => {
          if (!cancelled) {
            modals.loading.show = false;
            resolve(result);
          }
        })
        .catch((error) => {
          if (!cancelled) {
            modals.loading.show = false;
            reject(error);
          }
        });
    });
  };

  const pickColor = (initialColor = "#3b82f6"): Promise<string | null> =>
    openModal("color", { value: initialColor });
  const pickDate = (initialDate?: string): Promise<string | null> =>
    openModal("date", {
      value: initialDate || new Date().toISOString().split("T")[0],
    });

  const handleConfirm = (ok: boolean) => {
    if (
      ok &&
      modals.confirm.password &&
      modals.confirm.passwordInput !== modals.confirm.password
    ) {
      alert("Incorrect password. Please try again", "error");
      return;
    }
    closeModal("confirm", ok);
  };

  const handlePrompt = (ok: boolean) => {
    if (!ok) return closeModal("prompt", null);

    if (modals.prompt.isMulti) {
      const questions = modals.prompt.question as string[];
      modals.prompt.answers[modals.prompt.currentIndex] = modals.prompt.answer;

      if (modals.prompt.currentIndex < questions.length - 1) {
        modals.prompt.currentIndex++;
        modals.prompt.answer =
          modals.prompt.answers[modals.prompt.currentIndex] || "";
        return;
      }
      closeModal("prompt", modals.prompt.answers);
    } else {
      closeModal("prompt", modals.prompt.answer);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    let isValid = true;

    modals.form.fields.forEach((field) => {
      const value = modals.form.data[field.name];

      if (
        field.required &&
        (!value || (Array.isArray(value) && value.length === 0))
      ) {
        errors[field.name] = `${field.label || field.name} is required`;
        isValid = false;
      }

      if (field.validation && value) {
        const error = field.validation(value);
        if (error) {
          errors[field.name] = error;
          isValid = false;
        }
      }

      if (
        field.type === "email" &&
        value &&
        typeof value === "string" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      ) {
        errors[field.name] = "Please enter a valid email address";
        isValid = false;
      }
    });

    if (isValid) closeModal("form", { ...modals.form.data });
    else modals.form.errors = errors;
  };

  const filteredSelectOptions = () => {
    if (
      !(modals.select.config as { searchable?: boolean }).searchable ||
      !modals.select.search
    )
      return modals.select.options;
    return modals.select.options.filter((option) => {
      const label = typeof option === "string" ? option : option.label;
      return label.toLowerCase().includes(modals.select.search.toLowerCase());
    });
  };

  onMount(() => {
    (window as unknown as Record<string, unknown>).alert = alert;
    (window as unknown as Record<string, unknown>).confirm = confirm;
    (window as unknown as Record<string, unknown>).prompt = prompt;
    (window as unknown as Record<string, unknown>).form = form;
    (window as unknown as Record<string, unknown>).select = select;
    (window as unknown as Record<string, unknown>).uploadFile = uploadFile;
    (window as unknown as Record<string, unknown>).loading = loading;
    (window as unknown as Record<string, unknown>).pickColor = pickColor;
    (window as unknown as Record<string, unknown>).pickDate = pickDate;
  });
</script>

<!-- Toast Container -->
<div class="fixed bottom-4 right-4 z-2147483647 space-y-2">
  {#each toasts as toast (toast._id)}
    <div
      in:fly={{ y: -10, duration: 100 }}
      out:fly={{ y: 10, duration: 100 }}
      class="min-w-64 flex items-center gap-3 p-4 rounded-lg border shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl {toastClasses[
        toast.type
      ]}"
    >
      <span class="flex-1">{toast.msg}</span>
      <div class="relative">
        <button
          onclick={() => removeToast(toast._id)}
          class="text-current hover:opacity-70 transition-opacity p-2 after:content-[''] after:absolute after:inset-0 cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>
    </div>
  {/each}
</div>

<!-- Confirm Dialog -->
<Dialog.Root
  bind:open={modals.confirm.show}
  onOpenChange={(open) => !open && handleConfirm(false)}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{modals.confirm.title || "Confirm"}</Dialog.Title>
    </Dialog.Header>
    <p class="text-muted-foreground">{modals.confirm.message}</p>
    {#if modals.confirm.password}
      <div class="space-y-2">
        <label for="confirm-password" class="text-sm font-medium">
          Type "{modals.confirm.password}" to confirm:
        </label>
        <Input
          id="confirm-password"
          type="text"
          placeholder={modals.confirm.password}
          bind:value={modals.confirm.passwordInput}
          onkeydown={(e) => e.key === "Enter" && handleConfirm(true)}
        />
      </div>
    {/if}
    <Dialog.Footer>
      <Button variant="outline" onclick={() => handleConfirm(false)}>
        {modals.confirm.options.cancelText || "Cancel"}
      </Button>
      <Button onclick={() => handleConfirm(true)}>
        {modals.confirm.options.confirmText || "Confirm"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Loading Dialog -->
<Dialog.Root bind:open={modals.loading.show}>
  <Dialog.Content showCloseButton={false}>
    <div class="text-center py-4">
      <Loader class="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
      <h3 class="text-lg font-medium mb-2">{modals.loading.message}</h3>
      {#if modals.loading.progress > 0}
        <div class="w-full bg-muted rounded-full h-2 mb-4">
          <div
            class="bg-primary h-2 rounded-full transition-all duration-300"
            style="width: {modals.loading.progress}%"
          ></div>
        </div>
        <p class="text-sm text-muted-foreground">
          {Math.round(modals.loading.progress)}%
        </p>
      {/if}
      {#if modals.loading.cancellable}
        <Button
          variant="outline"
          onclick={() => modals.loading.cancelFn?.()}
          class="mt-4"
        >
          Cancel
        </Button>
      {/if}
    </div>
  </Dialog.Content>
</Dialog.Root>

<!-- Prompt Dialog -->
<Dialog.Root
  bind:open={modals.prompt.show}
  onOpenChange={(open) => !open && handlePrompt(false)}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>
        {modals.prompt.isMulti
          ? `Question ${modals.prompt.currentIndex + 1} of ${(modals.prompt.question as string[]).length}`
          : modals.prompt.title || "Input Required"}
      </Dialog.Title>
    </Dialog.Header>

    {#if modals.prompt.isMulti}
      <div class="mb-4">
        <div class="flex gap-1 mb-2">
          {#each modals.prompt.question as _, i}
            <div
              class="w-2 h-2 rounded-full {i <= modals.prompt.currentIndex
                ? 'bg-primary'
                : 'bg-muted'}"
            ></div>
          {/each}
        </div>
        <div class="w-full bg-muted rounded-full h-1">
          <div
            class="bg-primary h-1 rounded-full transition-all duration-300"
            style="width: {((modals.prompt.currentIndex + 1) /
              (modals.prompt.question as string[]).length) *
              100}%"
          ></div>
        </div>
      </div>
    {/if}

    <p class="text-muted-foreground mb-4">
      {Array.isArray(modals.prompt.question)
        ? modals.prompt.question[modals.prompt.currentIndex]
        : modals.prompt.question}
    </p>

    <Input
      type={(modals.prompt.options as { type?: string }).type === "password"
        ? "password"
        : "text"}
      placeholder={Array.isArray(
        (modals.prompt.options as { placeholder?: string | string[] })
          ?.placeholder
      )
        ? (modals.prompt.options as { placeholder: string[] }).placeholder[
            modals.prompt.currentIndex || 0
          ] || "..."
        : (modals.prompt.options as { placeholder?: string })?.placeholder ||
          "..."}
      bind:value={modals.prompt.answer}
      onkeydown={(e) =>
        e.key === "Enter"
          ? handlePrompt(true)
          : e.key === "Escape" && handlePrompt(false)}
    />

    <Dialog.Footer class="mt-4">
      <div class="flex justify-between w-full">
        <div>
          {#if modals.prompt.isMulti && modals.prompt.currentIndex > 0}
            <Button
              variant="outline"
              onclick={() => {
                modals.prompt.answers[modals.prompt.currentIndex] =
                  modals.prompt.answer;
                modals.prompt.currentIndex--;
                modals.prompt.answer =
                  modals.prompt.answers[modals.prompt.currentIndex] || "";
              }}
            >
              Back
            </Button>
          {/if}
        </div>
        <div class="flex gap-2">
          <Button variant="outline" onclick={() => handlePrompt(false)}>
            {(modals.prompt.options as { cancel?: string }).cancel || "Cancel"}
          </Button>
          <Button onclick={() => handlePrompt(true)}>
            {modals.prompt.isMulti &&
            modals.prompt.currentIndex <
              (modals.prompt.question as string[]).length - 1
              ? "Next"
              : (modals.prompt.options as { ok?: string }).ok || "Ok"}
          </Button>
        </div>
      </div>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Form Dialog -->
<Dialog.Root
  bind:open={modals.form.show}
  onOpenChange={(open) => !open && closeModal("form", null)}
>
  <Dialog.Content
    class={modals.form.options.width === "lg" ? "sm:max-w-2xl" : ""}
  >
    <Dialog.Header>
      <Dialog.Title
        >{(modals.form.options as { title?: string }).title ||
          "Form"}</Dialog.Title
      >
    </Dialog.Header>

    <form
      onsubmit={(e) => {
        e.preventDefault();
        validateForm();
      }}
      class="space-y-4"
    >
      {#each modals.form.fields as field}
        <div class="space-y-2">
          <label for={field.name} class="text-sm font-medium">
            {field.label || field.name}
            {#if field.required}<span class="text-destructive">*</span>{/if}
          </label>

          {#if field.type === "textarea"}
            <Textarea
              id={field.name}
              bind:value={modals.form.data[field.name] as string}
              placeholder={field.placeholder}
            />
          {:else if field.type === "select"}
            <select
              id={field.name}
              bind:value={modals.form.data[field.name] as string}
              class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring"
            >
              {#if field.options}
                {#each field.options as option}
                  {#if typeof option === "string"}
                    <option value={option}>{option}</option>
                  {:else}
                    <option value={option.value}>{option.label}</option>
                  {/if}
                {/each}
              {/if}
            </select>
          {:else if field.type === "checkbox"}
            <label class="flex items-center gap-2">
              <input
                type="checkbox"
                bind:checked={modals.form.data[field.name] as boolean}
                class="rounded border-input text-primary focus:ring-primary"
              />
              <span class="text-sm text-muted-foreground"
                >{field.placeholder || "Check this box"}</span
              >
            </label>
          {:else}
            <Input
              id={field.name}
              type={field.type}
              bind:value={modals.form.data[field.name]}
              placeholder={field.placeholder}
            />
          {/if}

          {#if modals.form.errors[field.name]}
            <p class="text-sm text-destructive">
              {modals.form.errors[field.name]}
            </p>
          {/if}
        </div>
      {/each}
    </form>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => closeModal("form", null)}>
        {(modals.form.options as { cancelText?: string }).cancelText ||
          "Cancel"}
      </Button>
      <Button onclick={validateForm}>
        {(modals.form.options as { submitText?: string }).submitText ||
          "Submit"}
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Select Dialog -->
<Dialog.Root
  bind:open={modals.select.show}
  onOpenChange={(open) => !open && closeModal("select", null)}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title
        >{(modals.select.config.title as string) ||
          "Select Option"}</Dialog.Title
      >
    </Dialog.Header>

    {#if modals.select.config.searchable}
      <div class="relative mb-4">
        <Search
          class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
        />
        <Input
          type="search"
          name="search-select"
          bind:value={modals.select.search}
          placeholder={(modals.select.config.placeholder as string) ||
            "Search..."}
          class="pl-10"
        />
      </div>
    {/if}

    <div class="max-h-64 overflow-y-auto space-y-2">
      {#each filteredSelectOptions() as option}
        {@const optionValue =
          typeof option === "string" ? option : option.value}
        {@const optionLabel =
          typeof option === "string" ? option : option.label}
        {@const isSelected = modals.select.config.multiple
          ? modals.select.value.includes(optionValue)
          : modals.select.value === optionValue}

        <button
          onclick={() => {
            if (modals.select.config.multiple) {
              const current = modals.select.value as string[];
              modals.select.value = current.includes(optionValue)
                ? current.filter((v) => v !== optionValue)
                : [...current, optionValue];
            } else {
              modals.select.value = optionValue;
            }
          }}
          class="w-full text-left p-3 rounded-lg border transition-colors {isSelected
            ? 'bg-primary/10 border-primary text-primary'
            : 'bg-background border-border hover:bg-accent'}"
        >
          <div class="flex items-center justify-between">
            <span>{optionLabel}</span>
            {#if isSelected}
              <div
                class="w-4 h-4 bg-primary rounded-full {modals.select.config
                  .multiple
                  ? 'flex items-center justify-center'
                  : ''}"
              >
                {#if modals.select.config.multiple}
                  <div class="w-2 h-2 bg-primary-foreground rounded-full"></div>
                {/if}
              </div>
            {/if}
          </div>
        </button>
      {/each}
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => closeModal("select", null)}
        >Cancel</Button
      >
      <Button
        onclick={() =>
          closeModal(
            "select",
            modals.select.config.multiple
              ? [...modals.select.value]
              : modals.select.value
          )}
      >
        Select
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- File Upload Dialog -->
<Dialog.Root
  bind:open={modals.file.show}
  onOpenChange={(open) => !open && closeModal("file", null)}
>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>{modals.file.title || "Upload Files"}</Dialog.Title>
    </Dialog.Header>

    <div
      class="border-2 border-dashed rounded-lg p-8 text-center transition-colors {modals
        .file.dragOver
        ? 'border-primary bg-primary/5'
        : 'border-border'}"
      ondragover={(e) => {
        e.preventDefault();
        modals.file.dragOver = true;
      }}
      ondragleave={(e) => {
        e.preventDefault();
        modals.file.dragOver = false;
      }}
      ondrop={(e) => {
        e.preventDefault();
        modals.file.dragOver = false;
        if (e.dataTransfer?.files)
          modals.file.selected = Array.from(e.dataTransfer.files);
      }}
      role="button"
      tabindex="0"
      onkeydown={(e) =>
        e.key === "Enter" && document.getElementById("fileInput")?.click()}
    >
      <Upload class="mx-auto w-12 h-12 text-muted-foreground mb-4" />
      <p class="text-muted-foreground mb-4">
        Drag and drop files here, or click to select
      </p>
      <input
        type="file"
        accept={modals.file.options.accept as string}
        multiple={modals.file.options.multiple as boolean}
        onchange={(e) => {
          const input = e.target as HTMLInputElement;
          if (input.files) modals.file.selected = Array.from(input.files);
        }}
        class="hidden"
        id="fileInput"
      />
      <Button onclick={() => document.getElementById("fileInput")?.click()}
        >Choose Files</Button
      >
    </div>

    {#if modals.file.selected.length > 0}
      <div class="mt-4 space-y-2">
        <h4 class="font-medium">Selected Files:</h4>
        {#each modals.file.selected as file}
          <div class="flex items-center justify-between p-2 bg-muted rounded">
            <span class="text-sm">{file.name}</span>
            <span class="text-xs text-muted-foreground"
              >{(file.size / 1024 / 1024).toFixed(2)} MB</span
            >
          </div>
        {/each}
      </div>
    {/if}

    <Dialog.Footer>
      <Button variant="outline" onclick={() => closeModal("file", null)}
        >Cancel</Button
      >
      <Button
        onclick={() => closeModal("file", [...modals.file.selected])}
        disabled={modals.file.selected.length === 0}
      >
        Upload ({modals.file.selected.length})
      </Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Color Picker Dialog -->
<Dialog.Root
  bind:open={modals.color.show}
  onOpenChange={(open) => !open && closeModal("color", null)}
>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title>{modals.color.title || "Pick a Color"}</Dialog.Title>
    </Dialog.Header>

    <div class="space-y-4">
      <input
        type="color"
        bind:value={modals.color.value}
        class="w-full h-32 rounded-lg border border-input cursor-pointer"
      />
      <Input
        type="text"
        bind:value={modals.color.value}
        placeholder="#3b82f6"
        class="font-mono"
      />
      <div class="grid grid-cols-8 gap-2">
        {#each ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280"] as color}
          <button
            onclick={() => (modals.color.value = color)}
            aria-label="Select color {color}"
            class="w-8 h-8 rounded border-2 {modals.color.value === color
              ? 'border-foreground'
              : 'border-border'}"
            style="background-color: {color}"
          ></button>
        {/each}
      </div>
    </div>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => closeModal("color", null)}
        >Cancel</Button
      >
      <Button onclick={() => closeModal("color", modals.color.value)}
        >Select</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>

<!-- Date Picker Dialog -->
<Dialog.Root
  bind:open={modals.date.show}
  onOpenChange={(open) => !open && closeModal("date", null)}
>
  <Dialog.Content class="sm:max-w-sm">
    <Dialog.Header>
      <Dialog.Title>{modals.date.title || "Select Date"}</Dialog.Title>
    </Dialog.Header>

    <Input type="date" bind:value={modals.date.value} />

    <Dialog.Footer>
      <Button variant="outline" onclick={() => closeModal("date", null)}
        >Cancel</Button
      >
      <Button onclick={() => closeModal("date", modals.date.value)}
        >Select</Button
      >
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
