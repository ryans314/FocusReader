---
timestamp: 'Thu Oct 09 2025 15:29:47 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251009_152947.47d7cc07.md]]'
content_id: edb9e65cf2a31783113f4207929160d8e6c80df7a76f7d60e7ef44b9a11176d9
---

# response:

Based on the provided text, the answer is very clear:

Concepts are **not allowed to directly interact with or refer to structures (state or functionality) defined in other concepts.**

Here's a breakdown of how this is established in the text:

1. **Mutual Independence is Paramount:**
   * "Perhaps the most significant distinguishing feature of concepts... is their **mutual independence**. Each concept is defined **without reference to any other concepts**, and can be understood in isolation."
   * "Reuse requires independence too, because **coupling between concepts would prevent a concept from being adopted without also including the concepts it depends on**."
   * "Polymorphism is key to independence: the designer of a concept should strive to make the concept as free as possible of any assumptions about the content and interpretation of objects passed as action arguments."

2. **Completeness of Functionality:**
   * Concepts are "complete with respect to their functionality and **don't rely on functionality from other concepts**."
   * Example: A `Notification` concept "cannot 'make a call' to an action of an emailing or text messaging context to actually deliver a notification. Instead that functionality would be part of the `Notification` concept itself."

3. **Composition by Synchronization (The Only Allowed Interaction):**
   * "Because concepts are fully independent of one another, **they cannot refer to each other or use each other's services**."
   * "Concepts are therefore composed using **synchronizations (or syncs)**."
   * **How syncs work:** A sync is an *external rule* that dictates interaction. It states that:
     * `when` an action occurs in one concept,
     * `where` the state of some concept has some property (allowing read-only inspection of state for conditions),
     * `then` some action happens in another concept (triggering functionality).
   * Syncs can provide input arguments to the actions they trigger, effectively passing data between concepts *indirectly*.

**In summary:**

* **Disallowed:** Concepts cannot directly access the state of another concept, nor can they directly call or depend on the actions/services of another concept.
* **Allowed:** Concepts interact *only indirectly* through **synchronizations (syncs)**. Syncs are external rules that observe actions in one concept, can inspect the state of concepts (for `where` conditions), and then trigger actions in other concepts, potentially passing data as arguments. This ensures that the concepts themselves remain completely independent and unaware of each existence or internal workings of other concepts.
