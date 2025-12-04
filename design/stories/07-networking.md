# User Story: Exporting the Data

## Story Overview
I want to be able to network my data with my healthcare professionals and several other trusted parties.  This will give me better safety for my data and will allow real-time access to my data.

Context: Bob has already been [using the app daily](02-daily.md) for some time.  He now wants to use his data for his benefit.

He learns that Sereus Health is built on [sereus fabric](sereus.org).  This means he can share his database with other peers/nodes in order to get safer data storage and share data in real time with providers.

## Sequence
1. Bob has already logged into a sereus node provider and stood up a node which he controls.  In that context, he has generated a QR code for the node ID.
2. He scans the QR with his phone camera.
3. The deep link launches Sereus Health and prompts that it is about to add the scanned node as part of Bob's cadre.  He confirms with OK.
4. The app returns to normal operation.
5. Bob wants to confirm the node was added so he goes to his settings page.  He sees a section for Sereus.
6. Entering the page, he sees his cadre consists of two nodes: His phone and the new node he just stood up.


**Alternative Path A: Adding Guest Nodes
7.1. On his next visit to his doctor, Bob finds out that his doctor also has sereus-aware software.
7.2. The receptionist generates a QR for Bob to scan.  Just like adding his own additional cadre nodes, the app prompts Bob to add this new node.  This time, he sees that it is a guest node--not a node he controls.
7.3. He confirms addition of the node.
7.4. Now in his settings page, he can see the whole cohort: His two nodes and several more nodes, the doctor's cadre.
7.5. Now his data is stored distributed across many systems.  He feels more secure that it won't be lost.  Also, his doctor can review his progress more easily.
7.6. Any time Bob wants, he can remove this doctor's cadre and/or add other guest nodes to his network.

## Acceptance Criteria
- [ ] The user can add Sereus nodes to strengthen his network
- [ ] These can be cadre nodes or guest nodes (controlled by someone else)
