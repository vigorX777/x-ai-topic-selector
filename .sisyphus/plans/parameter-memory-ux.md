# Plan: Parameter Memory & Prefill UX Enhancement

## Overview
Improve the user experience when re-running `/select-topics` by:
1. Always showing previously saved values as default/prefilled options
2. When user chooses to modify a specific parameter, show the current value for easy editing

## Current Behavior (Problem)
- Step 0b shows saved config summary but doesn't prefill values
- When user selects "修改列表 URL", they have to re-type from scratch
- No indication of current values in modification prompts

## Desired Behavior
1. **Saved config detected** → Show summary with all saved values
2. **User selects "修改 X"** → Show current value in the question prompt, user can edit or replace
3. **User selects "重新配置全部"** → Each step shows previous value as hint/default

---

## Tasks

### Task 1: Update Step 0b - Add "使用上次配置" as recommended option
- [x] Already exists in current SKILL.md ✓

### Task 2: Update Step 2 (列表 URL) - Show previous value in prompt
**File:** `SKILL.md`
**Section:** Step 2: 收集 X 列表 URL (around line 105-122)

**Change:** Update the question prompt to include previous value when available

**Before:**
```
question({
  questions: [{
    header: "X 列表 URL",
    question: "请输入要扫描的 X 列表 URL 地址（支持多个，用逗号分隔）\n\n示例格式：https://x.com/i/lists/1234567890",
    options: []
  }]
})
```

**After:**
```
question({
  questions: [{
    header: "X 列表 URL", 
    question: "请输入要扫描的 X 列表 URL 地址（支持多个，用逗号分隔）\n\n示例格式：https://x.com/i/lists/1234567890\n\n${previousConfig ? `📌 上次使用: ${previousConfig.listUrls.join(', ')}` : ''}",
    options: previousConfig?.listUrls ? [
      { label: previousConfig.listUrls.join(', '), description: "使用上次的列表 URL" }
    ] : []
  }]
})
```

### Task 3: Update Step 3 (评分模式) - Mark previous selection as default
**File:** `SKILL.md`
**Section:** Step 3: 选择评分模式 (around line 124-143)

**Change:** When previous config exists, show "(上次选择)" marker on the previously selected mode

**After:**
```
question({
  questions: [{
    header: "评分模式",
    question: "请选择选题评分模式",
    options: [
      { 
        label: `数据分析模式${previousConfig?.scoreMode === 'data-only' ? ' (上次选择)' : ''} (Recommended)`, 
        description: "基于互动数据评分，无需 API Key" 
      },
      { 
        label: `AI 分析模式${previousConfig?.scoreMode === 'ai-only' ? ' (上次选择)' : ''}`, 
        description: "基于 AI 内容分析，需要 Gemini API Key" 
      }
    ]
  }]
})
```

### Task 4: Update Step 3c (选题范围) - Mark previous selection
**File:** `SKILL.md`  
**Section:** Step 3c (around line 159-178)

**Change:** Similar to Task 3, mark previous selection

### Task 5: Update Step 4 (扫描数量) - Show previous value
**File:** `SKILL.md`
**Section:** Step 4 (around line 180-196)

**Change:** 
- Add previous value as first option if it's a custom value
- Mark previously selected option with "(上次选择)"

**After:**
```
question({
  questions: [{
    header: "扫描数量",
    question: "请选择要扫描的推文数量",
    options: [
      // If previous value is custom (not 100/200/500), add it as first option
      ...(previousConfig?.maxTweets && ![100, 200, 500].includes(previousConfig.maxTweets) 
        ? [{ label: `${previousConfig.maxTweets} 条 (上次选择)`, description: "使用上次的自定义数量" }]
        : []),
      { label: `100 条${previousConfig?.maxTweets === 100 ? ' (上次选择)' : ''}`, description: "快速扫描" },
      { label: `200 条${previousConfig?.maxTweets === 200 ? ' (上次选择)' : ''} (Recommended)`, description: "标准扫描" },
      { label: `500 条${previousConfig?.maxTweets === 500 ? ' (上次选择)' : ''}`, description: "深度扫描" }
    ]
  }]
})
```

### Task 6: Update Step 5 (推荐条数) - Show previous value
**File:** `SKILL.md`
**Section:** Step 5 (around line 198-216)

**Change:** Same pattern as Task 5

### Task 7: Update Step 6 (输出目录) - Show previous value
**File:** `SKILL.md`
**Section:** Step 6 (around line 218-235)

**Change:** Show previous custom path if exists

### Task 8: Add instruction for Agent behavior
**File:** `SKILL.md`
**Section:** Add new section after "配置持久化"

**Add guidance for Agent:**
```markdown
## 参数回填规则

当检测到已保存配置时，Agent **必须**在每个交互步骤中：

1. **文本输入类参数**（URL、自定义路径）：
   - 在 question prompt 中显示 `📌 上次使用: <value>`
   - 将上次值作为第一个 option（方便用户直接选择复用）
   
2. **选择类参数**（评分模式、数量选项）：
   - 在上次选择的选项后添加 `(上次选择)` 标记
   - 如果上次是自定义值，将其作为额外选项添加在列表最前面

3. **条件性参数**（API Key）：
   - 出于安全考虑不保存/回填 API Key
   - 每次需要时重新询问

4. **部分修改时**：
   - 用户选择"修改 X"时，只询问该参数，其他参数自动复用上次值
   - 被修改的参数也要显示上次值供参考
```

---

## Verification

After updating SKILL.md:
1. Read through the updated flow to ensure consistency
2. Test mentally: 
   - First run (no config) → normal flow
   - Second run → shows saved config, user can reuse or modify
   - Modify single param → shows previous value, other params auto-reused

---

## Summary Table

| Step | Parameter | Prefill Method |
|------|-----------|----------------|
| Step 2 | 列表 URL | Show in prompt + add as first option |
| Step 3 | 评分模式 | Mark with "(上次选择)" |
| Step 3b | API Key | Never save/prefill (security) |
| Step 3c | 选题范围 | Mark with "(上次选择)" |
| Step 4 | 扫描数量 | Mark standard options + add custom if different |
| Step 5 | 推荐条数 | Mark standard options + add custom if different |
| Step 6 | 输出目录 | Show in prompt + add as option if custom |
