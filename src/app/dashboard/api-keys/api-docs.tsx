"use client"

import { useEffect, useState } from "react"
import { CopyIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

function Code({ code }: { code: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto border bg-muted/30 p-3 pr-12 font-mono text-xs">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute top-1.5 right-1.5"
        aria-label="Copy"
        onClick={() => navigator.clipboard.writeText(code)}
      >
        <CopyIcon />
      </Button>
    </div>
  )
}

const FIELDS = [
  ["firstName", "string", "Yes", "Contact first name"],
  ["lastName", "string", "Yes", "Contact last name"],
  ["email", "string", "Yes", "Valid email. Must be unique."],
  ["phone", "string", "No", "Phone number"],
  ["message", "string", "No", "Free text, e.g. form message"],
]

const WP_FIELDS = [
  [
    "Contact Form 7",
    "Name your fields first-name, last-name (or one your-name), your-email, phone, your-message.",
  ],
  [
    "WPForms",
    "No setup. Uses the Name, Email, Phone and Paragraph Text fields.",
  ],
  [
    "Elementor Pro Forms",
    "In each field's Advanced tab, set ID to first_name, last_name (or one name), email, phone, message.",
  ],
  [
    "Gravity Forms",
    "No setup. Uses the Name, Email, Phone and Paragraph Text fields.",
  ],
]

const RESPONSES = [
  ["200", "Contact created. Returns the contact JSON."],
  ["400", "Invalid body. Returns field errors."],
  ["401", "Missing or invalid API key."],
  ["409", "A contact with this email already exists."],
]

export function ApiDocs() {
  // Read origin after mount so server and client HTML match.
  const [origin, setOrigin] = useState("https://your-domain.com")
  useEffect(() => setOrigin(window.location.origin), [])

  const url = `${origin}/api/v1/add-contact`
  const body = `{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "phone": "+1 555 0100",
  "message": "I want a demo"
}`

  const curl = `curl -X POST ${url} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${body.replace(/\n\s*/g, " ")}'`

  const node = `// Run on your server (Node.js, Next.js route, serverless function).
const res = await fetch("${url}", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.MARKETING_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phone: form.phone,
    message: form.message,
  }),
})
if (!res.ok) console.error(await res.json())`

  const php = `<?php
// Run on your server. Keep the key in an env var.
$ch = curl_init("${url}");
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer " . getenv("MARKETING_API_KEY"),
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "firstName" => $_POST["firstName"],
    "lastName"  => $_POST["lastName"],
    "email"     => $_POST["email"],
    "phone"     => $_POST["phone"] ?? null,
    "message"   => $_POST["message"] ?? null,
  ]),
]);
$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);`

  const wpConfig = `define( 'MARKETING_AGENT_API_KEY', 'YOUR_API_KEY' );`

  const wpPlugin = `<?php
/**
 * Plugin Name: Marketing Agent Connector
 * Description: Sends form submissions to Marketing Agent as contacts.
 * Version:     1.0.0
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) exit;

define( 'MARKETING_AGENT_URL', '${url}' );

function marketing_agent_send( $data ) {
	if ( ! defined( 'MARKETING_AGENT_API_KEY' ) ) {
		error_log( 'Marketing Agent: MARKETING_AGENT_API_KEY is not set in wp-config.php' );
		return;
	}

	$first = trim( (string) ( $data['firstName'] ?? '' ) );
	$last  = trim( (string) ( $data['lastName'] ?? '' ) );
	// Split a single "full name" field into first and last name.
	if ( $last === '' && strpos( $first, ' ' ) !== false ) {
		list( $first, $last ) = explode( ' ', $first, 2 );
	}
	$email = sanitize_email( $data['email'] ?? '' );
	if ( $first === '' || ! is_email( $email ) ) return;

	$body = array_filter( array(
		'firstName' => $first,
		'lastName'  => $last !== '' ? $last : '-', // API needs a last name
		'email'     => $email,
		'phone'     => trim( (string) ( $data['phone'] ?? '' ) ),
		'message'   => trim( (string) ( $data['message'] ?? '' ) ),
	), fn( $v ) => $v !== '' );

	$res = wp_remote_post( MARKETING_AGENT_URL, array(
		'timeout' => 5,
		'headers' => array(
			'Authorization' => 'Bearer ' . MARKETING_AGENT_API_KEY,
			'Content-Type'  => 'application/json',
		),
		'body'    => wp_json_encode( $body ),
	) );

	if ( is_wp_error( $res ) ) {
		error_log( 'Marketing Agent: ' . $res->get_error_message() );
		return;
	}
	$code = wp_remote_retrieve_response_code( $res );
	// 409 means the contact already exists. That is OK.
	if ( $code >= 300 && $code !== 409 ) {
		error_log( "Marketing Agent: HTTP $code " . wp_remote_retrieve_body( $res ) );
	}
}

// Contact Form 7
add_action( 'wpcf7_mail_sent', function ( $form ) {
	$submission = WPCF7_Submission::get_instance();
	if ( ! $submission ) return;
	$d = $submission->get_posted_data();
	marketing_agent_send( array(
		'firstName' => $d['first-name'] ?? $d['your-name'] ?? '',
		'lastName'  => $d['last-name'] ?? '',
		'email'     => $d['your-email'] ?? $d['email'] ?? '',
		'phone'     => $d['phone'] ?? $d['your-phone'] ?? '',
		'message'   => $d['your-message'] ?? $d['message'] ?? '',
	) );
} );

// WPForms
add_action( 'wpforms_process_complete', function ( $fields ) {
	$data = array();
	foreach ( $fields as $f ) {
		switch ( $f['type'] ) {
			case 'name':
				$data['firstName'] = ! empty( $f['first'] ) ? $f['first'] : $f['value'];
				$data['lastName']  = $f['last'] ?? '';
				break;
			case 'email':    $data['email']   ??= $f['value']; break;
			case 'phone':    $data['phone']   ??= $f['value']; break;
			case 'textarea': $data['message'] ??= $f['value']; break;
		}
	}
	marketing_agent_send( $data );
} );

// Elementor Pro Forms
add_action( 'elementor_pro/forms/new_record', function ( $record ) {
	$f = array();
	foreach ( $record->get( 'fields' ) as $id => $field ) {
		$f[ $id ] = $field['value'];
	}
	marketing_agent_send( array(
		'firstName' => $f['first_name'] ?? $f['name'] ?? '',
		'lastName'  => $f['last_name'] ?? '',
		'email'     => $f['email'] ?? '',
		'phone'     => $f['phone'] ?? '',
		'message'   => $f['message'] ?? '',
	) );
} );

// Gravity Forms
add_action( 'gform_after_submission', function ( $entry, $form ) {
	$data = array();
	foreach ( $form['fields'] as $field ) {
		$id = (string) $field->id;
		switch ( $field->type ) {
			case 'name':
				$data['firstName'] = rgar( $entry, $id . '.3' ) ?: rgar( $entry, $id );
				$data['lastName']  = rgar( $entry, $id . '.6' );
				break;
			case 'email':    $data['email']   ??= rgar( $entry, $id ); break;
			case 'phone':    $data['phone']   ??= rgar( $entry, $id ); break;
			case 'textarea': $data['message'] ??= rgar( $entry, $id ); break;
		}
	}
	marketing_agent_send( $data );
}, 10, 2 );`

  const test = `curl ${origin}/api/v1/hello \\
  -H "Authorization: Bearer YOUR_API_KEY"`

  return (
    <section className="space-y-6 border p-6">
      <div>
        <h2 className="font-heading text-lg font-semibold tracking-tight">
          API Documentation
        </h2>
        <p className="text-sm text-muted-foreground">
          Send contacts from any website or form to this app.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Authentication</h3>
        <p className="text-sm text-muted-foreground">
          Send your API key in the <code>Authorization</code> header on every
          request.
        </p>
        <Code code="Authorization: Bearer YOUR_API_KEY" />
        <p className="border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
          Keep your API key secret. Call this API from your server only. Do not
          put the key in browser JavaScript or HTML, because anyone can read it
          there.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Test your key</h3>
        <p className="text-sm text-muted-foreground">
          <code>GET /api/v1/hello</code> returns a message if the key works.
        </p>
        <Code code={test} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Add a contact</h3>
        <p className="font-mono text-sm">
          <span className="font-semibold">POST</span> {url}
        </p>
        <p className="text-sm text-muted-foreground">
          Creates a contact. The app then sends one enabled campaign to the
          contact automatically.
        </p>
        <div className="overflow-x-auto border">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 text-left">
              <tr>
                <th className="p-2">Field</th>
                <th className="p-2">Type</th>
                <th className="p-2">Required</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {FIELDS.map(([name, type, req, note]) => (
                <tr key={name} className="border-t">
                  <td className="p-2 font-mono">{name}</td>
                  <td className="p-2">{type}</td>
                  <td className="p-2">{req}</td>
                  <td className="p-2 text-muted-foreground">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground">Example body:</p>
        <Code code={body} />
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Responses</h3>
        <div className="overflow-x-auto border">
          <table className="w-full text-xs">
            <tbody>
              {RESPONSES.map(([status, note]) => (
                <tr key={status} className="border-t first:border-t-0">
                  <td className="w-16 p-2 font-mono">{status}</td>
                  <td className="p-2 text-muted-foreground">{note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">WordPress</h3>
        <p className="text-sm text-muted-foreground">
          This small plugin sends every form submission to this app. It works
          with Contact Form 7, WPForms, Elementor Pro Forms and Gravity Forms.
          It needs PHP 7.4 or newer.
        </p>
        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li className="space-y-2">
            <p>
              Open <code>wp-config.php</code>. Add this line above{" "}
              <code>{"/* That's all, stop editing! */"}</code>:
            </p>
            <Code code={wpConfig} />
          </li>
          <li className="space-y-2">
            <p>
              Create the file{" "}
              <code>
                wp-content/plugins/marketing-agent-connector/marketing-agent-connector.php
              </code>{" "}
              with this code:
            </p>
            <Code code={wpPlugin} />
          </li>
          <li>
            In WordPress admin, go to <strong>Plugins</strong>. Activate{" "}
            <strong>Marketing Agent Connector</strong>.
          </li>
          <li className="space-y-2">
            <p>Set up your form fields:</p>
            <div className="overflow-x-auto border">
              <table className="w-full text-xs">
                <tbody>
                  {WP_FIELDS.map(([plugin, note]) => (
                    <tr key={plugin} className="border-t first:border-t-0">
                      <td className="w-40 p-2 font-medium">{plugin}</td>
                      <td className="p-2 text-muted-foreground">{note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </li>
          <li>
            Send a test form. The contact shows on the Contacts page. If not,
            check <code>wp-content/debug.log</code> for lines that start with
            &quot;Marketing Agent&quot;. Turn on <code>WP_DEBUG_LOG</code> to
            get this log.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Forms need a name and a valid email. Forms without them are skipped.
          Every form on the site is sent. To limit it, add a check for the form
          ID at the top of the matching hook.
        </p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Examples</h3>
        <p className="text-xs text-muted-foreground">cURL</p>
        <Code code={curl} />
        <p className="text-xs text-muted-foreground">Node.js / JavaScript</p>
        <Code code={node} />
        <p className="text-xs text-muted-foreground">PHP</p>
        <Code code={php} />
      </div>
    </section>
  )
}
