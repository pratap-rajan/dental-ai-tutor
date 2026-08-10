import os
import boto3

cognito = boto3.client(
    "cognito-idp",
    region_name=os.environ.get("REGION", "eu-west-2")
)

ADMIN_GROUP_NAME = os.environ.get("ADMIN_GROUP_NAME", "Admins")

# Optional: an SES-sender / notify address for admin approval alerts.
# If unset, notification is skipped (logged only) — this trigger's core
# job (disable-unless-admin) still works without it.
ADMIN_NOTIFY_EMAIL = os.environ.get("ADMIN_NOTIFY_EMAIL", "")
SES_SENDER = os.environ.get("SES_SENDER", "")

ses = boto3.client(
    "ses",
    region_name=os.environ.get("REGION", "eu-west-2")
) if ADMIN_NOTIFY_EMAIL and SES_SENDER else None


def is_in_admin_group(user_pool_id, username):
    """
    Checks whether this user is already a member of the Admins group.
    A user only ends up in this group via a manual, out-of-band action
    (the account owner promoting themselves via the AWS CLI after their
    first real sign-in) — this trigger never adds anyone to the group
    itself, it only ever reads membership.
    """
    try:
        response = cognito.admin_list_groups_for_user(
            Username=username,
            UserPoolId=user_pool_id
        )
        group_names = [g["GroupName"] for g in response.get("Groups", [])]
        return ADMIN_GROUP_NAME in group_names
    except Exception as ex:
        # Fail safe: if we can't confirm admin status for any reason,
        # treat as NOT admin — this means a real error here results in
        # a legitimate admin briefly needing manual re-enabling, rather
        # than an unverified account silently staying enabled.
        print(f"WARNING: could not check group membership for {username}: {ex}")
        return False


def notify_admin_of_pending_approval(user_pool_id, username, email, name):
    """
    Best-effort notification that a new account is awaiting approval.
    Non-fatal if SES isn't configured or the send fails — the account
    is already correctly disabled by the time this runs, so a failed
    notification never leaves an unapproved account accessible.
    """
    if not ses:
        print(f"Notification skipped (SES not configured) — pending approval: {name} <{email}>")
        return

    try:
        subject = "New student account pending approval — Plan Ore Academy"
        body = (
            f"A new student has signed in and is awaiting approval.\n\n"
            f"Name:     {name}\n"
            f"Email:    {email}\n"
            f"Username: {username}\n\n"
            f"To approve, run:\n"
            f"  aws cognito-idp admin-enable-user "
            f"--user-pool-id {user_pool_id} --username {username} --region eu-west-2\n"
        )

        ses.send_email(
            Source=SES_SENDER,
            Destination={"ToAddresses": [ADMIN_NOTIFY_EMAIL]},
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body}}
            }
        )
        print(f"Approval notification sent to {ADMIN_NOTIFY_EMAIL}")

    except Exception as ex:
        # Non-fatal by design — see docstring.
        print(f"WARNING: could not send approval notification: {ex}")


def lambda_handler(event, context):
    """
    Cognito Post Confirmation trigger.

    Fires immediately after a user's identity is confirmed — for
    federated (Google/Microsoft) sign-in, this happens automatically
    the moment the identity provider hands back a verified identity,
    with no separate email-confirmation step for the student to complete.

    Behaviour:
      - If the user is already in the Admins group (promoted via a
        prior manual CLI action), do nothing — they stay enabled and
        get instant access, no approval wait.
      - Otherwise, disable the account immediately and notify the
        admin that a new account is awaiting manual approval via
        AdminEnableUser.

    This trigger must return the event object unmodified (Cognito
    requires this for all Lambda triggers) — it should never raise an
    exception that isn't caught, since an uncaught exception here can
    block the sign-in flow entirely for the user currently signing in.
    """

    print("EVENT =", event)

    try:
        user_pool_id = event["userPoolId"]
        username = event["userName"]

        user_attributes = event.get("request", {}).get("userAttributes", {})
        email = user_attributes.get("email", "unknown")
        name = user_attributes.get("name", email)

        print(f"Post-confirmation for username={username} email={email} name={name}")

        if is_in_admin_group(user_pool_id, username):
            print(f"{username} is in the {ADMIN_GROUP_NAME} group — skipping disable, instant access granted")
            return event

        # Not an admin — disable pending manual approval.
        try:
            cognito.admin_disable_user(
                UserPoolId=user_pool_id,
                Username=username
            )
            print(f"Disabled {username} pending approval")
        except Exception as ex:
            # If we can't disable the account, this is a real problem —
            # log loudly, but still don't raise, since raising here
            # would show the student a broken sign-in error rather than
            # completing their (soon-to-be-corrected) account creation.
            print(f"ERROR: could not disable {username}, needs manual review: {ex}")

        notify_admin_of_pending_approval(user_pool_id, username, email, name)

    except Exception as ex:
        # Absolute last-resort catch-all. Cognito trigger failures can
        # block sign-in entirely for the user currently authenticating,
        # so this trigger deliberately never lets an exception escape —
        # worst case, an account that should have been disabled stays
        # enabled until the next manual review, which is a far better
        # failure mode than breaking sign-in for everyone.
        print(f"ERROR: unexpected failure in post-confirmation trigger: {ex}")

    return event
