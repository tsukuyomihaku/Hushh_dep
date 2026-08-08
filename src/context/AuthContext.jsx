useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setEmailVerified(!!firebaseUser?.emailVerified);
      if (firebaseUser) {
        const saved = localStorage.getItem(storageKey(firebaseUser.uid));
        if (saved) {
          try {
            setPrivateKey(await importPrivateKey(JSON.parse(saved)));
          } catch {
            setPrivateKey(null);
          }
        }
        // Self-heal: if Firebase Auth already considers this account
        // verified (e.g. it was verified before the Firestore-mirroring
        // feature existed, so it never passed through the verify screen
        // that normally writes this), make sure the public Firestore
        // profile agrees. Without this, an otherwise-legitimate, already-
        // verified account would stay permanently hidden from everyone
        // else's contact list.
        if (firebaseUser.emailVerified) {
          try {
            await updateDoc(doc(db, "users", firebaseUser.uid), { emailVerified: true });
          } catch (err) {
            console.error("Failed to self-heal verified status in Firestore:", err);
          }
        }
      } else {
        setPrivateKey(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);