// components/swipeController.ts
export const swipeController = {
  openRef: null as any,
  setOpen(ref: any) {
    this.openRef = ref;
  },
  getOpen() {
    return this.openRef;
  },
  closeOpen() {
    try {
      if (this.openRef && typeof this.openRef.close === "function") {
        this.openRef.close();
      }
    } catch (err) {
      // ignore
    } finally {
      this.openRef = null;
    }
  },
};
