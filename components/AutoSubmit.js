'use client';
// <select> that submits its form as soon as the value changes.
export default function AutoSubmit(props) {
  return <select {...props} onChange={(e) => e.currentTarget.form.requestSubmit()} />;
}
