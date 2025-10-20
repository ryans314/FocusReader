---
timestamp: 'Mon Oct 20 2025 02:50:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_025056.8a926e1d.md]]'
content_id: a3b57f63ef9ee933a2191ac90631e353f62a60bd4765a628aaf6cd06752897d8
---

# response:

My apologies again for the oversight in correctly identifying the section in the `concept-state` document. You are absolutely right.

Here is the exact quote from the `concept-state` section, under the heading "Two views of a declaration," which includes the sub-section "Multiple structures":

***

**Two views of a declaration**

Consider a declaration such as:

```
a set of Users with
  a username String
  a password String
```

There are different ways to view this:

* **Collection of objects or documents**. In this view, the declaration introduces a collection of structured objects or documents, in this case a collection of users, each of which has a username and a password.
* **Set and relations**. In this view, the declaration introduces a set of identifiers (say {u1, u2, u3}), and two relations, one called username that maps each user to their username (say {(u1, "Alice"), (u2, "Bob"), (u3, "Carol")}), and one called password that maps each user to their password (say {(u1, "foo"), (u2, "bar"), (u3, "baz")}).

The collection of objects view is probably how non-technical readers will prefer to understand the declaration, and most of the time that view will suffice. But the sets and relations view is more correct, and addresses some subtle points more straightforwardly. Here are some examples of these subtleties:

* **Shared substructure**. The collection of objects view might appear to suggest that these objects cannot "share" sub-objects, but that is not the case. In this model for book clubs, for example, the collection of objects view might seem to suggest that a book club somehow "owns" a book, which makes it confusing that a member of the club also seems to own books (the ones they've read). But there is no such issue; the sets and relation view makes it clear that the same book (identifier) can be a book in a book club and in the set of books read by a member:

  ```
  a set of BookClubs with
   a set of Books
   a set of Members

  a set of Books with
   a title String
   an author String	

  a set of Members with
   a read set of Books
  ```

* **Multiple structures**. The relational view makes it easier to understand how multiple declarations can define structural aspects of the "same object." In the two declarations below, for example, a user acquires a username and password from the first, and an avatar and display name from the second. This kind of separation of concerns is a central feature of concept design and is not easily explained using traditional object-oriented notions that require an object to have a single global definition.

  ```
  a set of Users with
    a username String
    a password String

  a set of Users with
    an Avatar
    a displayName String
  ```

* **Defining associations**. The relational view also makes it easier to grasp how an association can be defined. For example, a declaration in one concept may define the expected, inherent structure of an object, and a declaration in another may define an object's association with another object. For example, in these declarations the first defines the conventional structure of an email address, and the second maps each email address to the server that hosts its email account:

  ```
  a set of EmailAddresses with
    a username String
    a Domain

  a set of EmailAddresses with 
    a Server
  ```

* **Generic types**. A concept can treat some types as parameters, which means that they are generic and instantiated on use. For example, a commenting concept may associate comments with generic "items," which in a particular system will turn out to be articles, or posts, etc. In this case, there will generally be declarations in different concepts that declare sets that will actually be the same set when the concepts are instantiated. For example, a posting concept might declare a set of posts with content and author, and a commenting concept might declare a set of items each of which is associated with a set of comments, where the items will turn out to be the posts:

  ```
  a set of Items with
   a set of Comments

  a set of Posts with 
   a content String
   an author User
  ```

***
