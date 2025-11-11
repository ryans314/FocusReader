```
[Requesting] Received request for path: /Profile/createAccount

Requesting.request {

username: 'demouser',

password: '1234567890',

path: '/Profile/createAccount'

} => { request: '019a73f1-74d3-70f1-b93b-b531a64488cf' }

Profile.createAccount { username: 'demouser', password: '1234567890' } => { error: "Username 'demouser' already exists." }

Requesting.respond {

request: '019a73f1-74d3-70f1-b93b-b531a64488cf',

error: "Username 'demouser' already exists."

} => { request: '019a73f1-74d3-70f1-b93b-b531a64488cf' }

[Requesting] Received request for path: /Profile/createAccount

Requesting.request {

username: 'demouser2',

password: '1234567890',

path: '/Profile/createAccount'

} => { request: '019a73f1-87ea-75fd-9621-a2c39dc804df' }

Profile.createAccount { username: 'demouser2', password: '1234567890' } => { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' }

Library.createLibrary { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } => { library: '019a73f1-8a89-7f07-9188-1c00db014db6' }

FocusStats.initUser { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } => { focusStats: '019a73f1-8b13-7b9b-9777-6c18a4a6c5cc' }

TextSettings.createUserSettings {

font: '"Times New Roman", Times, serif',

fontSize: 16,

lineHeight: 24,

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4'

} => { settings: '019a73f1-8b9b-7d4e-b809-53b22dbe116d' }

Requesting.respond {

request: '019a73f1-87ea-75fd-9621-a2c39dc804df',

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

library: '019a73f1-8a89-7f07-9188-1c00db014db6',

focusStats: '019a73f1-8b13-7b9b-9777-6c18a4a6c5cc',

settings: '019a73f1-8b9b-7d4e-b809-53b22dbe116d'

} => { request: '019a73f1-87ea-75fd-9621-a2c39dc804df' }

[Requesting] Received request for path: /auth/login

Requesting.request { username: 'demouser2', password: '1234567890', path: '/auth/login' } => { request: '019a73f1-8fcf-78ac-b3b7-22a7109351fd' }

Profile.authenticate { username: 'demouser2', password: '1234567890' } => { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' }

Sessioning.create { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } => { session: '019a73f1-921e-7e6d-a65d-47184998b358' }

Requesting.respond {

request: '019a73f1-8fcf-78ac-b3b7-22a7109351fd',

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

session: '019a73f1-921e-7e6d-a65d-47184998b358',

message: 'Login successful'

} => { request: '019a73f1-8fcf-78ac-b3b7-22a7109351fd' }

[Requesting] Received request for path: /Library/createDocument

Requesting.request {

name: 'Mice and Men',

epubContent: 'UEsDBAoAAAAAAAAAfv9vYassFAAAABQAAAAIAAAAbWltZXR5cGVhcHBsaWNhdGlvbi9lcHViK3ppcFBLAwQKAAAAAAAAAH7/AAAAAAAAAAAAAAAACQAAAE1FVEEtSU5GL1BLAwQKAAAAAAAAAH7/FiXg8f8AAAD/AAAAFgAAAE1FVEEtSU5GL2NvbnRhaW5lci54bWw8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJ1dGYtOCIgc3RhbmRhbG9uZT0ibm8iPz4KPGNvbnRhaW5lciB4bWxucz0idXJuOm9hc2lzOm5hbWVzOnRjOm9wZW5kb2N1bWVudDp4bWxuczpjb250YWluZXIiIHZlcnNpb249IjEuMCI+PHJvb3RmaWxlcz48cm9vdGZpbGUgZnVsbC1wYXRoPSJPRUJQUy9wYWNrYWdlLm9wZiIgbWVkaWEtdHlwZT0iYXBwbGljYXRpb24vb2VicHMtcGFja2FnZSt4bWwiLz48L3Jvb3RmaWxlcz48L2NvbnRhaW5lcj5QSwMECgAAAAAAAAB+/wAAAAAAAAAAAAAAAAYAAABPRUJQUy9QSwMECgAAAAAA8YprW9F780oFBQAABQUAABQAAABPRUJQUy9iazAxLXRvYy54aHRtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJubyI/Pg0KPCFET0NUWVBFIGh0bWw+DQo8aHRtbCB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCIgeG1sbnM6ZXB1Yj0iaHR0cDovL3d3dy5pZHBmLm9yZy8yMDA3L29wcyIgeG1sbnM6bT0iaHR0cDovL3d3dy53My5vcmcvMTk5OC9NYXRoL01hdGhNTCIgeG1sbnM6cGxzPSJodHRwOi8vd3d3LnczLm9yZy8yMDA1LzAxL3Byb251bmNpYXRpb24tbGV4aWNvbiIgeG1sbnM6c3NtbD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8xMC9zeW50aGVzaXMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxoZWFkPjx0aXRsZT5PZiBNaWNlIGFuZCBNZW48L3RpdGxlPjxsaW5rIHJlbD0ic3R5bGVzaGVldCIgdHlwZT0idGV4dC9jc3MiIGhyZWY9ImRvY2Jvb2stZXB1Yi5jc3MiIC8+PGxpbmsgcmVsPSJzdHlsZXNoZWV0IiB0eXBlPSJ0ZXh0L2NzcyIgaHJlZj0iZXB1YmJvb2tzLmNzcyIgLz48bWV0YSBuYW1lPSJnZW5lcmF0b3IiIGNvbnRlbnQ9IkRvY0Jvb2sgWFNMIFN0eWxlc2hlZXRzIFZzbmFwc2hvdF85ODg1IiAvPjwvaGVhZD48Ym9keT48aGVhZGVyPjwvaGVhZGVyPjxoMSBpZD0iZnItT0VCUFMtYmswMS10b2MteGh0bWwtMyI+T2YgTWljZSBhbmQgTWVuPC9oMT48ZGl2IGNsYXNzPSJ0b2MiIGlkPSJmci1PRUJQUy1iazAxLXRvYy14aHRtbC0xIj48ZGl2IGNsYXNzPSJ0b2MtdGl0bGUiIGlkPSJmci1PRUJQUy1iazAxLXRvYy14aHRtbC0yIj5UYWJsZSBvZiBDb250ZW50czwvZGl2PjxuYXYgZXB1Yjp0eXBlPSJ0b2MiPjxvbD48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTQiPjxhIGhyZWY9ImNoMDEueGh0bWwiPjEuIDE8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTUiPjxhIGhyZWY9ImNoMDIueGh0bWwiPjIuIDI8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTYiPjxhIGhyZWY9ImNoMDMueGh0bWwiPjMuIDM8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTciPjxhIGhyZWY9ImNoMDQueGh0bWwiPjQuIDQ8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTgiPjxhIGhyZWY9ImNoMDUueGh0bWwiPjUuIDU8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTkiPjxhIGhyZWY9ImNoMDYueGh0bWwiPjYuIDY8L2E+PC9saT48L29sPjwvbmF2PjwvZGl2Pjxmb290ZXI+PC9mb290ZXI+PC9ib2R5PjwvaHRtbD5QSwMECgAAAAAAAAB+/8XmRxaqIAEAqiAB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'... 384188 more characters,

library: '019a73f1-8a89-7f07-9188-1c00db014db6',

session: '019a73f1-921e-7e6d-a65d-47184998b358',

path: '/Library/createDocument'

} => { request: '019a73f1-ce29-799f-aa5e-cfdae7b36c15' }

Sessioning.getUser { session: '019a73f1-921e-7e6d-a65d-47184998b358' } => [ { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } ]

[LibraryConcept.createDocument] Attempting to create document 'Mice and Men' in library 019a73f1-8a89-7f07-9188-1c00db014db6

[LibraryConcept.createDocument] Inserting new document record: 019a73f1-d083-774b-8cb7-21ece43d58cf

[LibraryConcept.createDocument] Document record inserted. Updating library 019a73f1-8a89-7f07-9188-1c00db014db6.

[LibraryConcept.createDocument] Library 019a73f1-8a89-7f07-9188-1c00db014db6 updated with new document.

Library.createDocument {

name: 'Mice and Men',

epubContent: 'UEsDBAoAAAAAAAAAfv9vYassFAAAABQAAAAIAAAAbWltZXR5cGVhcHBsaWNhdGlvbi9lcHViK3ppcFBLAwQKAAAAAAAAAH7/AAAAAAAAAAAAAAAACQAAAE1FVEEtSU5GL1BLAwQKAAAAAAAAAH7/FiXg8f8AAAD/AAAAFgAAAE1FVEEtSU5GL2NvbnRhaW5lci54bWw8P3htbCB2ZXJzaW9uPSIxLjAiIGVuY29kaW5nPSJ1dGYtOCIgc3RhbmRhbG9uZT0ibm8iPz4KPGNvbnRhaW5lciB4bWxucz0idXJuOm9hc2lzOm5hbWVzOnRjOm9wZW5kb2N1bWVudDp4bWxuczpjb250YWluZXIiIHZlcnNpb249IjEuMCI+PHJvb3RmaWxlcz48cm9vdGZpbGUgZnVsbC1wYXRoPSJPRUJQUy9wYWNrYWdlLm9wZiIgbWVkaWEtdHlwZT0iYXBwbGljYXRpb24vb2VicHMtcGFja2FnZSt4bWwiLz48L3Jvb3RmaWxlcz48L2NvbnRhaW5lcj5QSwMECgAAAAAAAAB+/wAAAAAAAAAAAAAAAAYAAABPRUJQUy9QSwMECgAAAAAA8YprW9F780oFBQAABQUAABQAAABPRUJQUy9iazAxLXRvYy54aHRtbDw/eG1sIHZlcnNpb249IjEuMCIgZW5jb2Rpbmc9IlVURi04IiBzdGFuZGFsb25lPSJubyI/Pg0KPCFET0NUWVBFIGh0bWw+DQo8aHRtbCB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94aHRtbCIgeG1sbnM6ZXB1Yj0iaHR0cDovL3d3dy5pZHBmLm9yZy8yMDA3L29wcyIgeG1sbnM6bT0iaHR0cDovL3d3dy53My5vcmcvMTk5OC9NYXRoL01hdGhNTCIgeG1sbnM6cGxzPSJodHRwOi8vd3d3LnczLm9yZy8yMDA1LzAxL3Byb251bmNpYXRpb24tbGV4aWNvbiIgeG1sbnM6c3NtbD0iaHR0cDovL3d3dy53My5vcmcvMjAwMS8xMC9zeW50aGVzaXMiIHhtbG5zOnN2Zz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxoZWFkPjx0aXRsZT5PZiBNaWNlIGFuZCBNZW48L3RpdGxlPjxsaW5rIHJlbD0ic3R5bGVzaGVldCIgdHlwZT0idGV4dC9jc3MiIGhyZWY9ImRvY2Jvb2stZXB1Yi5jc3MiIC8+PGxpbmsgcmVsPSJzdHlsZXNoZWV0IiB0eXBlPSJ0ZXh0L2NzcyIgaHJlZj0iZXB1YmJvb2tzLmNzcyIgLz48bWV0YSBuYW1lPSJnZW5lcmF0b3IiIGNvbnRlbnQ9IkRvY0Jvb2sgWFNMIFN0eWxlc2hlZXRzIFZzbmFwc2hvdF85ODg1IiAvPjwvaGVhZD48Ym9keT48aGVhZGVyPjwvaGVhZGVyPjxoMSBpZD0iZnItT0VCUFMtYmswMS10b2MteGh0bWwtMyI+T2YgTWljZSBhbmQgTWVuPC9oMT48ZGl2IGNsYXNzPSJ0b2MiIGlkPSJmci1PRUJQUy1iazAxLXRvYy14aHRtbC0xIj48ZGl2IGNsYXNzPSJ0b2MtdGl0bGUiIGlkPSJmci1PRUJQUy1iazAxLXRvYy14aHRtbC0yIj5UYWJsZSBvZiBDb250ZW50czwvZGl2PjxuYXYgZXB1Yjp0eXBlPSJ0b2MiPjxvbD48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTQiPjxhIGhyZWY9ImNoMDEueGh0bWwiPjEuIDE8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTUiPjxhIGhyZWY9ImNoMDIueGh0bWwiPjIuIDI8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTYiPjxhIGhyZWY9ImNoMDMueGh0bWwiPjMuIDM8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTciPjxhIGhyZWY9ImNoMDQueGh0bWwiPjQuIDQ8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTgiPjxhIGhyZWY9ImNoMDUueGh0bWwiPjUuIDU8L2E+PC9saT48bGkgaWQ9ImZyLU9FQlBTLWJrMDEtdG9jLXhodG1sLTkiPjxhIGhyZWY9ImNoMDYueGh0bWwiPjYuIDY8L2E+PC9saT48L29sPjwvbmF2PjwvZGl2Pjxmb290ZXI+PC9mb290ZXI+PC9ib2R5PjwvaHRtbD5QSwMECgAAAAAAAAB+/8XmRxaqIAEAqiABAB0AAABPRUJQUy9ib29rY292ZXItZ2VuZXJhdGVkLmpwZ//Y/+AAEEpGSUYAAQECACUAJQAA/9sAQwADAgICAgIDAgICAwMDAwQGBAQEBAQIBgYFBgkICgoJCAkJCgwPDAoLDgsJCQ0RDQ4PEBAREAoMEhMSEBMPEBAQ/9sAQwEDAwMEAwQIBAQIEAsJCxAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQ/8AAEQgEsAMgAwERAAIRAQMRAf/EAB4AAQAABgMBAAAAAAAAAAAAAAABAgMEBQYHCAkK/8QAXRAAAQMBBAQFDwgGBwYFBAIDAAECAwQFBgcRCBIhMRMUQVHRCRUYIjI3UlRWYZGTlKGyF1NXcXJzgZIWI0JVdLEZNDU2OLPBJDOiwuHwYmel0uNDdYSVJWOCZCb/xAAdAQEAAwEBAQEBAQAAAAAAAAAAAQIDBAUGBwgJ/8QAOxEBAAECBAQFAgQFAgYDAQAAAAECEQMEEiEFFTFRBhMUQVIyUyIzNGEWQnGBoQdiNWNykbHRI0PBJP/aAAwDAQACEQMRAD8A7VaNujdg3bmDdg2jaV0WS1ErZFe9Zn5r26pyL5gOTuxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IDsVsDfIuP1z+kB2K2BvkXH65/SA7FbA3yLj9c/pAditgb5Fx+uf0gOxWwN8i4/XP6QHYrYG+Rcfrn9IHGOklo3YN2Hg3b1o2bdFkVRE2NWPSZ+aduicq+cDk7RV7x13fsSfGoHLYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADiTSq7x14vsR/GgDRV7x13fsSfGoHLYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADiTSq7x14vsR/GgDRV7x13fsSfGoHLYAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADiTSq7x14vsR/GgDRV7x13fsSfGoHLYAABBVREzVckQCw6/WKiqi2zQ5p//ALDOkz8yjvDp9Dmvt1f9p/8AR1+sX980PtDOkeZR3g9Dmft1f9p/9HX6xf3zQ+0M6R5lHeD0OZ+3V/2n/wBHX6xf3zQ+0M6R5lHeD0OZ+3V/2n/0jDa9lVMiQ09p0kkju5YydrnL9SIpaK6aukqYmWxsKL4lExH7xML8sxAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABxJpVd468X2I/jQBoq9467v2JPjUDlsAAAsrX2WXWqni8nwqUxPolvlP1FH9Y/8ALxEte1LTba1dq2jVInGZdiTO8NfOfitddWud/d/p1lcrgTl8O9EfTHtHZa9drV/eVX653SRrr7y6PSYHwj/tB12tX95VfrndI1195PSYHwj/ALQkltu0YY1kktWqa1N6rO7pNMGnGx64w8O8zLg4jj8P4Vlqs3m4ppopi8zMQ5O0Iry2la2lrc6nfaFU6nSOt7R0zla79Uu9M9p+mcF4PHD6NeJN65fw7/qZ/qRX4vzU5bJUxTlqZ22jf+72HPefk4AAAAAAAAAsrWtWgsOzqi1rUqGwUtLG6WWR25rUTNV9wHHuDOkfg/j/ANdvkqvU22eskjYq3KB8fBuXPJO2RM9y7gOTwODcVdNPRwwUvPLc7EfEGGy7WhRrpKdaeSRWoqZpnqovIBq1mdUf0PbXrYqChxZp3TzORjGupZW5qq5JtVoHYyxrZsu8FmwWvY9bFV0dSxHxTRORzXIvMqAX4AAAA4vxl0kcHsAHWSzFW9bLGdbkjoqFFhfIsrkVEXY1Fy3oByHZdpUds2fT2pZ8qyU9TG2WJ6tVNZrkzRcl8ygXoAABK5zWornKiIiZqqruA4MxW02dGzBa11sG/wBiLT0le3fDBE+oX/gRQMpg7pZ4C491UtDhhfuntSpgy14HRuhk28zXoir+AF5jJpM4MYBVtj0GKV7W2RUW89Y6BnAPlWRUVEXuEXLaqbVA5Ppp4aqmirIHa0UzGyMdztVM0X0KBWAAAAADVcSsSrnYR3Nr7+39tdtmWJZqNWpqXMVyM1lRE2JtXaqAW+FmLNxMabpU1+cOrZ66WNVq5sNRwTo0crVyXY5EXYoG5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABxJpVd468X2I/jQBoq9467v2JPjUDlsAAAsrY/smu/h5PhUzr+mf6N8p+ow/8Aqj/y8OrY/teu/iZfiU/FMT65/q/1Cyn6ej/pj/wszN1ITSxwxrJI5GtTeqm2Dg149cYeHF5l53EeI5bhWWqzebqimimLzMtRte13171jjVUiTk5z9N4JwSjh1EYmJvXP+H8N/wCp/wDqfmfGWZnK5SZpy1M7R8nN2gJ/i1uZ91W/5Sn0D8hez4ACjU1ENJTy1dQ9GRQsdI9y7kaiZqvoQDoPiX1Tyulv3aVxtH7CSov+yynK2otCKpdExqpnrJlq+ZU3gcjaIGn1YWktbNpXLvBdVbp3ps5NlnyTLIs2SKrslVEVMkTlA40v91U2G5ePdp4S0uGjrUoaGTgYaynqnOkmfq55aiIuW3JOUC3w36qVaddjHR4YYw4QSXLjtGXg21UlYsnBIqdoqoqJra2abl2ZgcraZmm/Pov27cq7thXMhvJV3rkXXY6qWFYGazUaqIiLmq62eQHKGkbj98gOAdoYyVFiNr6iigppG0Czamu+VWpq63mzX0Adf8RdKm2cSOp529j5V3ebYM1oxLBTUzJ1kzzm4PY5cl27QOm+hnpZXj0fMIrQbh3g7V3utCrmdPbNWyV0TaZEeqsXuV180Vd24D0Y0OtM+72lhdO1bTprEWxrasFqLaNnrIsiRZ56qo5UTNFyUDzcvzaWEmNnVH7UrcY6iP8AQeSZY6tJJXNZlHDqsbm3aiaycgG26ZFx+p6Xbwjq48DIIWX9qZYGWUykqJ3q9eERH5oqqm5QO5mh/aNToyaE9i29jpaL7IhsuKaplZU9s6Fj3qsbc0zVVVFTZyAcKWp1V6/9rur7fw50dq22LrWXIqSWnxxzUkZnlrI3V83JmB2k0SdMO5mlVcuut+zKNbJtWxkRbVs579fiueeS62zNFRFA4Rxg6p1BZF/6nDbAfDWfEGvpXK2eogndFHGrd6Z6uXIvKgGX0WeqP0WNuJXyPYgXAmudeeVVbSwyTOkSdyJm5FzRNVUT0gdfOqL2i/GLS7w+wajnRUsWZZZGq7JGtcjZFz/BoHZG/unfNZWKFiYBaP8Ah58odvsiihtFYqlYIqNEY3br5aq7M+XkA2XSe05LB0ZbGsizrSsFbcvpazE1LFim1Va/Zm1XoiomWf4gcFWX1VS+t2r3WXZGMuANXdey7YlbHDWcbdMrEcqIioiN270A9FqCrhtChp6+nXOOpiZMz7Lmoqe5QOnfVLNKS3MA8NaK6lyp3016L5q6moqpioqwNRUR65edHZZgaBon9TRwxrMPqS+ukLYc947122zjUsdVUSIlOj+2TLJ23NFzA1C9/U8sQ8KtJuxsSNGix0oLtQTte+BKv+rtyRH92ubkXaBq2l+s2OHVC7mYN5rUMsJ0Tns2qiPWJsi+9qqB2X0kOqAUOBd+qPBPDrD+qvzfGGBjKmiikdC2n7RFb22So7NOYDScHeqdW9b2MVm4OYvYPSXSrLQerFqFreFWJVTNubctufmA5b0s9O66mjVXUN1bKsFb03rtBEWOyo5liVuaIqazslyzRcwODbtdVRvXYl+bLuxjZgVV3ToLXlbHHW8adNqayoje1RvbZ5pygdiNLHTVuVou2BZlRWWc+2retuNH2dZUb9R02eW92S6u9N4HWuLqrGIV1bwWZFito61V3rHtmVrIKrjzpFa1VREVERu3egHLXVAtIHDa6mCNjUd87iJfKxL7rGsdn8dfSLJkrVTtm9smSu5uQDPWTjbhDol6Kt37xTXXS6lnPp3S2bd9al08rnOdmqI9Uzdmq715wOvdb1WLEyxoqS99vaNlZR3RrZdWKtkr1RdTW1dbJW7OfaB25vPph4VXa0faTSEltJJbEtCDXo2oi600meSsRN+x2wDqNWdVfxUgsxl+W6M9Sl0HSKiV/XFVRzNbLW2N2Ad7MAcaLBx/wtsfFC7kEkFJarXZRyIqOY5q5OTanOByMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABxJpVd468X2I/jQBoq9467v2JPjUDlsAAAsrY/smu/h5PhUzr+mf6N8p+ow/wDqj/y8OrY/teu/iZfiU/FMT65/q/1Cyn6ej/pj/wALKaWOGNZJHI1qb1Utg4NePXGHhxeZYcR4jluFZarN5uqKaKYvMy1G17XfXvWONVSJOTnP03gnBKOHURiYm9c/4fw3/qf/AKn5nxlmZyuUmactTO0fJjD6B+QuwOgH/i0uZ91W/wCUoHs+AA676ft97aw90VL63ou/M6Kuggiije1dqJJI1i+5VA8+tBjDnS9ocLKq/WBtu2ZQ2XeV8rqt1Qylkeuo9c81l2t3qByjowaPGIly8f7c0k8SbyUlXxCkqnVz6bg0Zrugc1uaRrqptA0zqV92buYn49Yi4qXv4Ce17GqGvoFncnapI96Lki78mogFHT+mszFvTLuThpcGGKa2rKqmurXUzEzTa1+1W79iKBe6Qmri/wBUyuphZWysWhsBlNGnCORGo9KVr137N7QOSOq84iU9l4b3Twrs+vjkmvDM2OSKORFVGxuZkrkRdn4gcf6dL/kW0LcK8D4V4BbdYrnxps2I9j81/BwHbDR1s/C/ArQ0oK6tls6GzobLnkqKpyMc6R8jV2K7eu1cgOpPUs4Ki69h404wWjFLTWGkbuKPcmTJ1VZdy8yZoBxloD6MWHOlXevES8mLlQ6Wns2rY6n1qpYleskj1XaiouSJkBV0+9GTBfRltS5FoYO2sjLYrqtVWjbOtSqq17clXNVy/EDknqlWIN/KnBHBK614ppKSS80b1tiJqaiSNjdGjM0TYmxcwO8lj2fhNo+aLbIWR2bHYNn2KrlXtHo6SWLPavKqucB5p6JFZe7DXRX0h8Z7HjnpIplpIrNkRqokzXTPa/V8yI4DtN1JS49zbKwVtHESbicts2/PJLaEsqtc9qRvdlv2tTaBwnFDRYtdVglta4aJJZdnO16itpm/q0WOmXNVVNiZqmQHEGMdlYs6R+m5fG3cFmPktSibqrUR5asMcdOrXb9m1GuA7M9RzvPdiaivtdW0LMhgvPZ87HT1Uz9eWp7Z2eWe1NVUAyempopW1j9idHingFf2htK9tnKivslz2IsbmJkmSvdlycwHDd3dJXGSxMZrv4M6aNxKO877PmbBSx/qY30+7Jc4UVHbkUD2As5IUoKbi0fBxcCzUZ4LdVMk/BAPI7qo9fnpN3EivIyRtjU1SxWudnqqiuYq5fjlmB6s2XeW7tNdWktLrzQpSQ0McmvxhmqjUjRd+eW4Drvg1p13cx2xgtnDO4t156iyrHjmWe3ElyjarGOXucuduW8Dp3otWlT4qdUAvvjxadRnQ3ZWV0k67Ub+pcz/AJcgNnuni3ibpO4z3nvrotXBobuLYMnB115auohmcuxUR3BTJzIu4DiPA+yr84o9Uks6nxLvXFe6rsiWSSutOClZBG7VhVUTUZ2qZLs/ADm/TB0T7043YyTY5aOF/KC171UvBpLZSvjTi7o26qZK9clz1eYDjPD/AElMUZcd7BwT0zriUd466zpUigenBRvpFyRUX9S3J+5OUDmzTm0XKnSUvdZV8MGr9UE17bHia9tjPezPPVRWIiudkmSInIB17XSXx7w0xJu/hPpnXHo70UdNPHTUtL+oY+JFVrUXWhRc+RQN36plPHiJjphLgpd6JI22Y5sqU7duo2VI35ZeZuwC203KhmJGmVhzgJbEiU93btx06Mjc7UjVVhjcvm3oB3k0jbU0WrKw8szD7SAks2GxLaZDDT0yMVHSKzVy1Vi7Zu3LcBw9pM6MWEGJWBVgYHYWXupLsNsJr5rDsyV6u4VZVSRc1e5F2rlv5wOnV5r76ZOhxduz8NsaLFobUw5qZUZFRO4sqTxo'... 384188 more characters,

library: '019a73f1-8a89-7f07-9188-1c00db014db6'

} => { document: '019a73f1-d083-774b-8cb7-21ece43d58cf' }

Sessioning.getUser { session: '019a73f1-921e-7e6d-a65d-47184998b358' } => [ { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } ]

[AnnotationConcept._registerDocument] Attempting to register document 019a73f1-d083-774b-8cb7-21ece43d58cf for creator 019a73f1-89f2-7af8-85dc-65a35f869dd4

[AnnotationConcept._registerDocument] Inserting new document view for 019a73f1-d083-774b-8cb7-21ece43d58cf.

[AnnotationConcept._registerDocument] Document 019a73f1-d083-774b-8cb7-21ece43d58cf registered successfully.

Annotation.registerDocument {

documentId: '019a73f1-d083-774b-8cb7-21ece43d58cf',

creatorId: '019a73f1-89f2-7af8-85dc-65a35f869dd4'

} => {}

TextSettings.createDocumentSettings {

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

font: 'serif',

fontSize: 16,

lineHeight: 24

} => { settings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21' }

Requesting.respond {

request: '019a73f1-ce29-799f-aa5e-cfdae7b36c15',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

message: 'Document created successfully.'

} => { request: '019a73f1-ce29-799f-aa5e-cfdae7b36c15' }

[Requesting] Received request for path: /Library/openDocument

Requesting.request {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

path: '/Library/openDocument'

} => { request: '019a73f1-f6b1-7ebb-bb47-cb841a5dbfbb' }

FocusStats.startSession {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

library: '019a73f1-8a89-7f07-9188-1c00db014db6'

} => { focusSession: '019a73f1-f779-7a2d-9f9a-c0f1190f7fb9' }

Requesting.respond {

request: '019a73f1-f6b1-7ebb-bb47-cb841a5dbfbb',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf'

} => { request: '019a73f1-f6b1-7ebb-bb47-cb841a5dbfbb' }

Annotation.search {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

criteria: ''

} => { annotations: [] }

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Georgia, serif',

fontSize: 16,

lineHeight: 24

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 24

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 26

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 27

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 29

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 27

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 26

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 24

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 18,

lineHeight: 27

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 20,

lineHeight: 30

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 22,

lineHeight: 33

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 20,

lineHeight: 30

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 18,

lineHeight: 27

} => {}

TextSettings.editSettings {

textSettings: '019a73f1-d28f-7b9e-9d13-34a6607bfe21',

font: 'Garamond, serif',

fontSize: 16,

lineHeight: 24

} => {}

Annotation.createAnnotation {

creator: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

color: '#c5e1a5',

content: 'Random Annontation',

location: '/6/8!/4/4[id440]/4[fr-OEBPS-ch01-xhtml-1],/1:0,/1:57',

tags: []

} => { annotation: '019a73f2-90a6-7f11-977a-19bfadd4f4c9' }

Annotation.updateAnnotation {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

annotation: '019a73f2-90a6-7f11-977a-19bfadd4f4c9',

newColor: '#fff176',

newContent: 'Change the text of the annotation'

} => { annotation: '019a73f2-90a6-7f11-977a-19bfadd4f4c9' }

[Requesting] Received request for path: /Library/closeDocument

Requesting.request {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

path: '/Library/closeDocument'

} => { request: '019a73f2-e2d4-7e26-9e3a-030f1280ceb4' }

FocusStats.endSession { focusSession: '019a73f1-f779-7a2d-9f9a-c0f1190f7fb9' } => { focusSession: '019a73f1-f779-7a2d-9f9a-c0f1190f7fb9' }

Requesting.respond {

request: '019a73f2-e2d4-7e26-9e3a-030f1280ceb4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf'

} => { request: '019a73f2-e2d4-7e26-9e3a-030f1280ceb4' }

[Requesting] Received request for path: /Library/openDocument

Requesting.request {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

path: '/Library/openDocument'

} => { request: '019a73f3-0160-7097-bda9-ffe9e1a57a27' }

FocusStats.startSession {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

library: '019a73f1-8a89-7f07-9188-1c00db014db6'

} => { focusSession: '019a73f3-0222-7cf3-ba23-fc1a87720a81' }

Requesting.respond {

request: '019a73f3-0160-7097-bda9-ffe9e1a57a27',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf'

} => { request: '019a73f3-0160-7097-bda9-ffe9e1a57a27' }

Annotation.search {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

criteria: ''

} => {

annotations: [

{

_id: '019a73f2-90a6-7f11-977a-19bfadd4f4c9',

creator: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

location: '/6/8!/4/4[id440]/4[fr-OEBPS-ch01-xhtml-1],/1:0,/1:57',

tags: [],

color: '#fff176',

content: 'Change the text of the annotation'

}

]

}

[Requesting] Received request for path: /Library/closeDocument

Requesting.request {

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

path: '/Library/closeDocument'

} => { request: '019a73f3-325b-72a2-a414-1f2d8afd3132' }

FocusStats.endSession { focusSession: '019a73f3-0222-7cf3-ba23-fc1a87720a81' } => { focusSession: '019a73f3-0222-7cf3-ba23-fc1a87720a81' }

Requesting.respond {

request: '019a73f3-325b-72a2-a414-1f2d8afd3132',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf'

} => { request: '019a73f3-325b-72a2-a414-1f2d8afd3132' }

[Requesting] Received request for path: /FocusStats/_viewStats

Requesting.request {

session: '019a73f1-921e-7e6d-a65d-47184998b358',

path: '/FocusStats/_viewStats'

} => { request: '019a73f3-42f6-7995-a47b-948c5d4f641f' }

Sessioning.getUser { session: '019a73f1-921e-7e6d-a65d-47184998b358' } => [ { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } ]

Requesting.respond {

request: '019a73f3-42f6-7995-a47b-948c5d4f641f',

stats: {

id: '019a73f1-8b13-7b9b-9777-6c18a4a6c5cc',

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

focusSessionIds: [

'019a73f1-f779-7a2d-9f9a-c0f1190f7fb9',

'019a73f3-0222-7cf3-ba23-fc1a87720a81'

]

}

} => { request: '019a73f3-42f6-7995-a47b-948c5d4f641f' }

[Requesting] Received request for path: /FocusStats/_getSessions

Requesting.request {

session: '019a73f1-921e-7e6d-a65d-47184998b358',

path: '/FocusStats/_getSessions'

} => { request: '019a73f3-47b8-7ccb-abad-53c4358b8aed' }

Sessioning.getUser { session: '019a73f1-921e-7e6d-a65d-47184998b358' } => [ { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } ]

Requesting.respond {

request: '019a73f3-47b8-7ccb-abad-53c4358b8aed',

sessions: Frames(2) [

{

_id: '019a73f1-f779-7a2d-9f9a-c0f1190f7fb9',

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

startTime: 2025-11-11T17:23:48.729Z,

endTime: 2025-11-11T17:24:49.314Z

},

{

_id: '019a73f3-0222-7cf3-ba23-fc1a87720a81',

user: '019a73f1-89f2-7af8-85dc-65a35f869dd4',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

startTime: 2025-11-11T17:24:56.994Z,

endTime: 2025-11-11T17:25:09.662Z

}

]

} => { request: '019a73f3-47b8-7ccb-abad-53c4358b8aed' }

[Requesting] Received request for path: /Profile/_getUserDetails

Requesting.request {

session: '019a73f1-921e-7e6d-a65d-47184998b358',

path: '/Profile/_getUserDetails'

} => { request: '019a73f3-a0b2-7e2b-8f44-7d5041a5bccc' }

Sessioning.getUser { session: '019a73f1-921e-7e6d-a65d-47184998b358' } => [ { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } ]

Requesting.respond {

request: '019a73f3-a0b2-7e2b-8f44-7d5041a5bccc',

username: 'demouser2'

} => { request: '019a73f3-a0b2-7e2b-8f44-7d5041a5bccc' }

[Requesting] Received request for path: /Library/removeDocument

Requesting.request {

session: '019a73f1-921e-7e6d-a65d-47184998b358',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf',

path: '/Library/removeDocument'

} => { request: '019a73f3-e36d-7870-9319-b6f2cbb6feac' }

Sessioning.getUser { session: '019a73f1-921e-7e6d-a65d-47184998b358' } => [ { user: '019a73f1-89f2-7af8-85dc-65a35f869dd4' } ]

Library.removeDocument {

library: '019a73f1-8a89-7f07-9188-1c00db014db6',

document: '019a73f1-d083-774b-8cb7-21ece43d58cf'

} => {}

Requesting.respond { request: '019a73f3-e36d-7870-9319-b6f2cbb6feac', success: true } => { request: '019a73f3-e36d-7870-9319-b6f2cbb6feac' }

[Requesting] Received request for path: /auth/logout

Requesting.request {

session: '019a73f1-921e-7e6d-a65d-47184998b358',

path: '/auth/logout'

} => { request: '019a73f3-f28c-78e2-9e2e-883a3b574a46' }

Sessioning.delete { session: '019a73f1-921e-7e6d-a65d-47184998b358' } => {}

Requesting.respond {

request: '019a73f3-f28c-78e2-9e2e-883a3b574a46',

message: 'Logged out successfully'

} => { request: '019a73f3-f28c-78e2-9e2e-883a3b574a46' }
```