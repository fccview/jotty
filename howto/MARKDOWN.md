# Markdown guide

Everything you can write in a note. The editor speaks GitHub Flavored Markdown (GFM), plus a handful of HTML tags for the things Markdown can't do on its own.

---

## Standard Markdown

### Text formatting

<table style="min-width: 75px;">
   <colgroup>
      <col style="min-width: 25px;">
      <col style="min-width: 25px;">
      <col style="min-width: 25px;">
   </colgroup>
   <tbody>
      <tr>
         <th colspan="1" rowspan="1">
            <p>Style</p>
         </th>
         <th colspan="1" rowspan="1">
            <p>Syntax</p>
         </th>
         <th colspan="1" rowspan="1">
            <p>Example</p>
         </th>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Bold</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>**Bold Text**</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><strong>Bold Text</strong></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><em>Italic</em></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>*Italic Text*</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><em>Italic Text</em></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><s>Strikethrough</s></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>~~Strikethrough~~</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><s>Strikethrough</s></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><code>Inline Code</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>`Inline Code`</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>Inline Code</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p>Link</p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>[Google](https://google.com)</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><a target="_blank" rel="noopener noreferrer nofollow" href="https://google.com">Google</a></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p>Image</p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>![Alt Text](image_url)</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p>Shows the image</p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p>Blockquote</p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>&gt; Quoted text</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p>&gt; Quoted text</p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p>Horizontal rule</p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>---</code></p>
         </td>
         <td colspan="1" rowspan="1">
            <p>A horizontal line</p>
         </td>
      </tr>
   </tbody>
</table>

### Headings

```markdown
# Heading 1

## Heading 2

### Heading 3
```

### Lists

**Unordered list**

```markdown
- Item 1
- Item 2
  - Nested Item
```

**Ordered list**

```markdown
1. First Item
2. Second Item
3. Third Item
```

---

## More elements

### Task lists

Checkboxes you can tick straight from the editor.

```markdown
- [x] Completed task
- [ ] Incomplete task
```

### Tables

Use Markdown pipe syntax or plain HTML.

```markdown
| Feature       | Status    |
| ------------- | --------- |
| Highlighting  | Supported |
| Keyboard Keys | Supported |
```

### Code blocks

Wrap code in triple backticks. Put a language name after the opening backticks to get syntax highlighting.

````markdown
javascript
function helloWorld() {
  console.log("Hello, world!");
}

````

### Callouts

Callouts are coloured boxes for things you don't want skimmed past. They use the GitHub and Obsidian syntax, and there are four styles. Jotty also reads GitHub's names for them, so a note copied from a README keeps its callouts.

| Style   | Jotty name   | GitHub name     |
| ------- | ------------ | --------------- |
| Info    | `[!INFO]`    | `[!NOTE]`       |
| Success | `[!SUCCESS]` | `[!TIP]`        |
| Warning | `[!WARNING]` | `[!IMPORTANT]`  |
| Danger  | `[!DANGER]`  | `[!CAUTION]`    |

```markdown
> [!INFO]
> This is an informational callout for general tips and notes.

> [!CAUTION]
> This one renders as a danger callout, here and on GitHub.
```

Saving a note from the rich text editor writes the Jotty name, so a `[!NOTE]` comes back as `[!INFO]`.

> [!TIP]
> In the rich text editor, type `/callout` to insert one. Click its icon to change the type.

---

## Custom HTML tags

You can type these HTML tags straight into a note. They survive switching between the rich text editor and the Markdown editor, and they render in the note view.

<table style="min-width: 75px;">
   <colgroup>
      <col style="min-width: 25px;">
      <col style="min-width: 25px;">
      <col style="min-width: 25px;">
   </colgroup>
   <tbody>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Element</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><strong>Description</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><strong>Syntax &amp; example</strong></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Keyboard key</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><kbd class="bg-muted px-2 py-1 text-xs rounded-jotty border border-border shadow-border shadow-sm">Enter</kbd></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>&lt;kbd&gt;Enter&lt;/kbd&gt;</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Highlight</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><mark class="bg-yellow-200 text-yellow-900 px-1 py-0.5 rounded-jotty">important</mark></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>&lt;mark&gt;important&lt;/mark&gt;</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Subscript</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p>H<sub class="">2</sub>O.</p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>H&lt;sub&gt;2&lt;/sub&gt;O</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Superscript</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p>E=mc<sup class="">2</sup></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>E=mc&lt;sup&gt;2&lt;/sup&gt;</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Abbreviation</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><abbr title="HyperText Markup Language" class="underline decoration-dotted cursor-help">HTML</abbr></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>&lt;abbr title="HyperText Markup Language"&gt;HTML&lt;/abbr&gt;.</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Collapsible section</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <details>
                <summary>Click to see more</summary>
                This content is hidden by default but can be expanded
            </details>
         </td>
         <td colspan="1" rowspan="1">
            <pre><code class="language-html">&lt;details&gt;
&nbsp; &nbsp; &lt;summary&gt;Click to see more!&lt;/summary&gt;&nbsp;
&nbsp; &nbsp; This content is hidden by default but can be expanded.&nbsp;
&lt;/details&gt;</code></pre>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Colored text</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <span style="color: magenta">Magenta text</span>
         </td>
         <td colspan="1" rowspan="1">
            <pre><code class="language-html">&lt;span style="color: magenta"&gt;Magenta text&lt;/span&gt;</code></pre>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>File attachment</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p>A link that shows as a downloadable file.</p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>[📎 report.pdf](/path/to/file)</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Video</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p>Embeds the video in the note.</p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>[🎥 video.mp4](/path/to/video)</code></p>
         </td>
      </tr>
      <tr>
         <td colspan="1" rowspan="1">
            <p><strong>Image</strong></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><img src="https://raw.githubusercontent.com/fccview/jotty/refs/heads/main/public/app-icons/favicon-32x32.png" alt="jotty Icon" width="32"></p>
         </td>
         <td colspan="1" rowspan="1">
            <p><code>![Alt Text](/path/to/image.jpg)</code></p>
         </td>
      </tr>
   </tbody>
</table>
