import { DEFAULT_LOCALE, type Locale } from './config';
import type { ConnectorStatus, StationAvailability } from '@/lib/types';

/**
 * All user-facing copy lives here. `en` is the shape of record — every key must
 * also exist in `mn`, which TypeScript enforces via the `Dictionary` annotation.
 *
 * Keep keys grouped by the surface they appear on. Interpolation uses {name}
 * placeholders resolved by `format()` in ./index.ts.
 */
export const en = {
  common: {
    appTagline: 'Charge your car with confidence',
    signIn: 'Sign in',
    signOut: 'Sign out',
    createAccount: 'Create account',
    myAccount: 'My account',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    cancel: 'Cancel',
    close: 'Close',
    back: 'Back',
    retry: 'Try again',
    loading: 'Loading…',
    search: 'Search',
    clear: 'Clear',
    remove: 'Remove',
    add: 'Add',
    confirm: 'Confirm',
    optional: 'optional',
    required: 'required',
    somethingWentWrong: 'Something went wrong. Please try again.',
    networkError: 'We could not reach the server. Check your connection and try again.',
    toggleNav: 'Toggle navigation',
    toggleTheme: 'Switch theme',
    language: 'Language',
  },

  nav: {
    home: 'Home',
    stations: 'Find a charger',
    pricing: 'Pricing',
    help: 'Help',
  },

  footer: {
    rights: '© {year} {brand}. Charging network powered by OCPP 1.6J.',
    terms: 'Terms',
    privacy: 'Privacy',
  },

  status: {
    connector: {
      Available: 'Available',
      Preparing: 'Preparing',
      Charging: 'Charging',
      SuspendedEV: 'Paused by car',
      SuspendedEVSE: 'Paused by station',
      Finishing: 'Finishing',
      Reserved: 'Reserved',
      Unavailable: 'Unavailable',
      Faulted: 'Out of order',
    } as Record<ConnectorStatus, string>,
    availability: {
      available: 'Available now',
      busy: 'All plugs in use',
      offline: 'Offline',
      unknown: 'Status unknown',
    } as Record<StationAvailability, string>,
  },
  account: {
    nav: {
      overview: 'Overview',
      wallet: 'Wallet',
      security: 'Security',
      sessions: 'Charging history',
    },
    title: 'My account',
    signedInAs: 'Signed in as {email}',
    verified: 'Verified',
    notVerified: 'Not verified',
    manage: 'Manage',
    statusTitle: 'Account status',
    emailLabel: 'Email address',
    confirmEmail: 'Confirm email',
    mobileLabel: 'Mobile number',
    noNumberYet: 'No number added yet',
    verifyNumber: 'Verify number',

    profile: {
      title: 'Your details',
      nameLabel: 'Name',
      phonePlaceholder: '+976 9911 2233',
      languageLabel: 'Language',
      languageHint: 'Used for emails and text messages we send you.',
      saveFailed: 'Could not save your details. Please try again.',
      networkError: 'Could not reach the server. Please check your connection and try again.',
    },

    password: {
      title: 'Password',
      currentLabel: 'Current password',
      newLabel: 'New password',
      confirmLabel: 'Confirm new password',
      changed: 'Your password has been changed. Other devices are now signed out.',
      failed: 'Could not change your password. Please try again.',
    },

    idTags: {
      title: 'Charge tags',
      body:
        'A charge tag is the RFID card or app code a charger reads to recognise you; your charging operator issues it and prints the code on the card.',
      none: 'No charge tags are linked yet.',
      addLabel: 'Add a charge tag',
      addHint: 'Enter the code printed on the card, exactly as shown.',
      addSubmit: 'Link tag',
      enterCode: 'Enter the code from your charge tag',
      linkFailed: 'Could not link that charge tag. Please try again.',
      unlinkFailed: 'Could not unlink that charge tag. Please try again.',
      linked: 'Charge tag {tag} is linked to your account.',
      unlinked: 'Charge tag {tag} is no longer linked to your account.',
      unlink: 'Unlink',
      unlinkConfirm: 'Unlink this tag?',
      unlinkYes: 'Yes, unlink',
      unlinkSr: ' charge tag {tag}',
      manage: 'Manage charge tags',
    },

    verification: {
      emailConfirmed:
        '{email} is confirmed. We use it for charging receipts and account notices.',
      emailPending:
        'Confirm {email} so we can send charging receipts and account notices. The link we email is valid for 24 hours.',
      resendEmail: 'Resend verification email',
      emailSendFailed: 'Could not send the verification email. Please try again.',
      verificationToken: 'Verification token',
      verificationCode: 'Verification code',
      devCaveat: 'Development mode — shown here because message delivery is not configured.',
      phoneTitle: 'Phone number',
      phoneConfirmed:
        '{phone} is confirmed, so we can text you about a charge that needs attention. To use a different number, change it on the Overview tab and verify it here.',
      overview: 'Overview',
      phonePending:
        'Verify a mobile number so we can text you about a charge that needs attention, and so you can reset your password by SMS.',
      phoneHint: 'Enter a different number here to verify that one instead.',
      sendCode: 'Send code',
      sendNewCode: 'Send a new code',
      codeSendFailed: 'Could not send the code. Please try again.',
      codeLabel: '6-digit code',
      codeSentTo: 'Sent to {destination}. It expires in 10 minutes.',
      codeWrong: 'That code did not work. Please try again.',
      phoneVerified: 'Your mobile number is verified.',
      networkError: 'Could not reach the server. Please check your connection and try again.',
    },

    sessions: {
      title: 'Charging history',
      unavailable: 'Charging history is unavailable',
      unavailableBody:
        'We could not reach the charging network just now, so your sessions are not shown. Please try again in a few minutes.',
      empty:
        'Your charging history appears here once a charge tag is linked to your account and used at a charger.',
      count: '{count} sessions',
      connector: 'Connector {id}',
      connectorHeader: 'Connector',
      started: 'Started',
      duration: 'Duration',
      energy: 'Energy',
      cost: 'Cost',
      rightNow: 'Right now',
      station: 'Station',
      status: 'Status',
      inProgress: 'In progress',
      completed: 'Completed',
      rejected: 'Rejected',
      stop: 'Stop',
      stopping: 'Stopping…',
      stopConfirm: 'Stop this session?',
      stopYes: 'Yes, stop',
      stopFailed: 'Could not stop the session. Please try again.',
      stopAccepted: 'Stop request accepted. The charger is ending the session now.',
      stopReplied: 'The charger replied “{status}”.',
      stopSr: ' session {id}',
      keepCharging: 'Keep charging',
      stopSrAt: ' charging at {station}',
      actions: 'Actions',
      caption: 'Your charging sessions, most recent first',
      stopAnswered:
        'The charger answered “{status}”. If the session keeps running, stop it at the station.',
    },
  },

  wallet: {
    title: 'Wallet',
    subtitle: 'Top your balance up with QPay and pay for charging automatically.',
    balance: 'Balance',
    balanceHint: 'Available to spend on charging',
    debt: 'Outstanding amount',
    debtHint: 'A session cost more than your balance. Top up to clear it.',
    frozen: 'This wallet is frozen. Please contact the operator.',
    toppedUp: 'Topped up in total',
    spent: 'Spent in total',
    linkedTags: 'Charge tags using this balance',
    noLinkedTags: 'No charge tag is linked yet. Link one under Overview.',
    lowBalance: 'Your balance is below {amount}. Top up before you charge.',
    unavailable: 'The wallet service is not available right now. Please try again shortly.',

    topUp: {
      title: 'Top up',
      chooseAmount: 'Choose an amount',
      customAmount: 'Or enter an amount',
      customPlaceholder: 'e.g. 15000',
      amountLabel: 'Amount (₮)',
      amountRange: 'Between {min} and {max}',
      submit: 'Top up',
      submitting: 'Creating invoice…',
      invalidAmount: 'Enter an amount',
      tooSmall: 'The smallest top-up is {min}',
      tooLarge: 'The largest top-up is {max}',
      disabled: 'Top-ups are temporarily unavailable.',
    },

    invoice: {
      title: 'Scan to pay',
      amount: 'Amount to pay',
      instruction: 'Scan the QR with your banking app, or pick your bank below.',
      openBank: 'Open banking app',
      waiting: 'Waiting for payment…',
      checkNow: 'I have paid',
      checking: 'Checking…',
      paid: '{amount} has been added to your wallet.',
      newBalance: 'New balance: {balance}',
      expired: 'This invoice has expired. Please start again.',
      canceled: 'This invoice was canceled.',
      failed: 'The invoice could not be created. Please try again.',
      notPaidYet: 'No payment has arrived yet. Try again in a moment.',
      startOver: 'Top up a different amount',
      expiresAt: 'Valid until {time}',
      qrAlt: 'QPay payment QR code',
    },

    history: {
      title: 'Wallet history',
      empty: 'No wallet activity yet.',
      viewAll: 'See all',
      type: {
        TOPUP: 'Top-up',
        CHARGE: 'Charging',
        REFUND: 'Refund',
        ADJUSTMENT: 'Adjustment',
        BONUS: 'Bonus',
      },
      balanceAfter: 'Balance: {balance}',
    },
  },

  home: {
    map: {
      title: 'Live map',
      subtitle: 'Plug status across the network, as it changes',
      filterLabel: 'Filters',
      groupPower: 'Power',
      groupCurrent: 'Current',
      groupConnector: 'Connector',
      groupStatus: 'Status',
      groupPrice: 'Price',
      optionAny: 'Any',
      currentDc: 'DC fast',
      currentAc: 'AC',
      powerAtLeast: '{power}+',
      priceUpTo: 'Max {price}',
      clearAll: 'Clear',
      clearAllHint: 'Reset every filter',
      count: '{count} stations',
      showList: 'List · {count}',
      hideList: 'Hide list',
      noResults: 'No station matches these filters.',
      listCapped: 'Showing {shown} of {total}',
      seeAllList: 'Open the full finder',
      locate: 'Near me',
      locating: 'Locating…',
      resetView: 'Fit every station',
      directions: 'Directions',
      clusterAria: '{count} stations in this area',
      zoomIn: 'Zoom in',
      zoomOut: 'Zoom out',
    },
    heroBadge: 'EV Charging Network',
    title: 'Charge seamlessly on every journey.',
    subtitle:
      'Check live plug availability, charging speed, clear pricing, and directions for every station across our network.',
    statFastTitle: 'Fast DC Power',
    statFastValue: 'Up to 180 kW',
    statLiveTitle: 'Live Plug Status',
    statLiveValue: '24/7 Real-time',
    statPayTitle: 'Instant Payment',
    statPayValue: 'QPay Wallet',
    networkTitle: 'Featured Charging Stations',
    networkSubtitle:
      'Real-time status of stations across our network. Filter by connector type, charging power, or distance.',
    seeAll: 'View all stations',
    noStations: 'No charging stations are currently online. Please try again shortly.',
    featuresBadge: 'Why Choose Us',
    featuresTitle: 'Smart & Reliable EV Charging',
    feature1Title: 'Live Availability',
    feature1Body: 'Check plug availability and power status in real-time before you arrive.',
    feature2Title: 'Ultra-Fast Charging',
    feature2Body: 'High-power DC fast chargers to get your vehicle back on the road in minutes.',
    feature3Title: 'Instant QPay Wallet',
    feature3Body: 'Top up your account balance in seconds and pay automatically per session.',
    feature4Title: 'Transparent Pricing',
    feature4Body: 'Clear per-kWh rates with zero hidden fees or unexpected charges.',
    howItWorksBadge: 'Simple & Convenient',
    howItWorks: 'How to charge in 3 steps',
    step1Title: '1. Find a Station',
    step1Body:
      'Search by location or address to see available stations and live connector availability.',
    step2Title: '2. Plug & Connect',
    step2Body:
      'Tap your RFID charge tag or start the charging session directly from your mobile phone.',
    step3Title: '3. Track & Pay',
    step3Body:
      'Monitor energy delivered, charging speed, and cost live, then pay instantly via your wallet balance.',
    ctaTitle: 'Ready for a smarter EV journey?',
    ctaBody:
      'Create your free account to link RFID charge tags, top up your wallet, and track every session receipt in one place.',
  },

  errors: {
    loading: 'Loading',
    networkUnreachable:
      'The charging network is not reachable right now. Please try again shortly.',
    sampleData: 'Sample data',
    stationsFailed: 'Stations could not be loaded',
    notFoundTitle: 'We could not find that page',
    notFoundCode: 'Error 404',
    notFoundBody:
      'The link may be out of date, or the charge point it pointed at is no longer published.',
    goHome: 'Go to the home page',
    stillStuck: 'Still stuck?',
    readHelp: 'Read the help page',
    errorTitle: 'Something went wrong',
    errorBody:
      'This page could not be loaded. The charging network may be busy or temporarily unreachable.',
    reference: 'Reference {digest} — quote this if you contact support.',
    helpContact: 'Help and contact details',
  },

  stations: {
    title: 'Find a charger',
    subtitle:
      'Live plug availability across the network. Filter by connector and power, or sort by how far away each station is.',
    metaDescription:
      'Search the charging network by name, connector and power, and see which plugs are free right now.',
    searchLabel: 'Search',
    searchPlaceholder: 'Name, address or tag',
    quickPlaceholder: 'Search by place, address or network',
    statusLabel: 'Status',
    anyStatus: 'Any status',
    connectorLabel: 'Connector',
    anyConnector: 'Any connector',
    minPowerLabel: 'Minimum power',
    anyPower: 'Any power',
    resultView: 'Result view',
    list: 'List',
    map: 'Map',
    updating: 'Updating results',
    noMatchTitle: 'No stations match this search',
    noMatchFiltered:
      'Try a wider power range, a different connector, or clear the filters to see the whole network.',
    useMyLocation: 'Use my location',
    locating: 'Finding you…',
    geoDenied: 'Location sharing is turned off for this site. Search by name instead.',
    geoTimeout: 'Finding your location took too long. Try again or search by name.',
    geoFailed: 'We could not work out where you are. Search by name instead.',
    geoUnsupported: 'This browser cannot share a location. Search by name instead.',
    addressMissing: 'Address not published',
    free: '{available}/{total} free',
    maxPower: 'Max power',
    price: 'Price',
    connectorsTitle: 'Connectors',
    detailsTitle: 'Details',
    hardware: 'Hardware',
    chargePoint: 'Charge point',
    lastSeen: 'Last seen',
    onlineNow: 'Online now',
    notPublished: 'Not published',
    unreachableTitle: 'This station cannot be reached',
    backToAll: 'Back to all chargers',
    directions: 'Directions',
    noConnectors: 'This charge point has not reported any connectors yet.',
    connectorN: 'Connector {id}: ',
    plugTypeMissing: 'Plug type not published',
    upToPower: 'Up to {power}',
    powerMissing: 'Power rating not published',
    outOfService: 'Taken out of service',
    nowPower: 'Now {power}',
    battery: 'Battery {percent}%',
    nearMe: 'Near me',
    stopSortingByDistance: 'Stop sorting by distance',
    clearFilters: 'Clear filters',
    countStations: '{count} stations',
    nearestFirst: ', nearest first',
    powerOrMore: '{power} or more',
    searchAria: 'Search for a charging station',
    findChargers: 'Find chargers',
    allChargers: '← All chargers',
    plugsFree: '{available}/{total} plugs free',
    demoBody:
      'Live data is unavailable right now, so this page shows a sample charge point. Status and pricing may not match the real station.',
    mapOf: 'Map showing {name}',
    perKwh: '{price} per kWh',
    unreachableBody:
      'The charging network did not answer for this charge point. It may be offline, or the network may be busy.',
    mapAria: 'Map of charging stations',
    viewStation: 'View station',
  },

  flow: {
    title: 'Charging',
    stepOf: 'Step {n} of {total}',
    // --- the ordered steps ---
    s1Title: 'Sign in',
    s1Body: 'Charging is billed to your account, so we need to know who you are.',
    s2Title: 'Link a charge tag',
    s2Body: 'Add the tag printed on your RFID card. It is what the station recognises you by.',
    s3Title: 'Pick a connector',
    s3Body: 'Choose a free plug that fits your car.',
    s4Title: 'Plug the cable in',
    s4Body: 'Connect the cable to your car before starting. The station will not lock it otherwise.',
    s5Title: 'Start the session',
    s5Body: 'We ask the station to begin. It has the final say and may decline.',
    s6Title: 'Waiting for the station',
    s6Body: 'The station accepted the request and is locking the cable. This usually takes a few seconds.',
    s7Title: 'Charging',
    s7Body: 'Energy is flowing. You can leave this page — the session keeps running.',
    s8Title: 'Stopping',
    s8Body: 'We asked the station to stop. It finishes the session and releases the cable.',
    s9Title: 'Finished',
    s9Body: 'The session is complete and the cost has been taken from your wallet.',
    // --- states and actions ---
    done: 'Done',
    current: 'Now',
    waiting: 'Waiting',
    startNow: 'Start charging',
    starting: 'Asking the station…',
    stopNow: 'Stop charging',
    stopping: 'Stopping…',
    liveEnergy: 'Delivered',
    livePower: 'Power now',
    liveBattery: 'Battery',
    liveCost: 'Cost so far',
    liveElapsed: 'Elapsed',
    sessionId: 'Session #{id}',
    connectorBusy: 'Every plug here is in use right now.',
    stationOffline: 'This station is not connected, so a session cannot be started.',
    localOnlyTitle: 'Start at the station itself',
    localOnlyBody:
      'This network starts sessions on the unit. Hold your charge tag against the reader and plug in — the steps below then continue on their own.',
    autoNote: 'Steps 6 to 9 happen on their own; nothing more is needed from you.',
    plugConfirm: 'The cable is plugged in',
    refreshFailed: 'Live updates paused — reconnecting…',
    viewReceipt: 'See this session',
    startAnother: 'Start another session',
  },

  start: {
    title: 'Start charging',
    body: 'Start a session on this charge point with one of your linked charge tags.',
    connectorLabel: 'Connector',
    anyConnector: 'Any free connector',
    tagLabel: 'Charge tag',
    submit: 'Start charging',
    submitting: 'Sending…',
    acceptedTitle: 'Request accepted',
    acceptedBody: 'The charge point accepted the request. Plug in if you have not already.',
    notStartedTitle: 'Not started',
    couldNotStartTitle: 'Could not start',
    requestFailed: 'The request could not be sent',
    rejected: 'The charge point did not accept the request',
    signInPrompt: 'Sign in and link a charge tag to start a session from your phone.',
    noTags: 'Link a charge tag to your account first.',
    disabled: 'This network starts sessions at the charge point itself. Present your tag there.',
    localOnly:
      'Sessions at this charge point are started on the unit itself — hold your charge tag against the reader and plug in.',
    signInBody:
      'Sign in to start a session from your phone. You can always start one at the charge point instead.',
    signInCta: 'Sign in to start',
    linkTagBody:
      'Link the charge tag printed on your RFID card to your account, and you can start a session from here.',
    linkTagCta: 'Link a charge tag',
    allBusy:
      'Every plug here is busy or out of service right now. Availability updates on this page as the station reports in.',
    connectorOption: 'Connector {id}',
    plugFirst: 'Plug the cable in first. The station has the final say and may still decline.',
    acceptedBody2: 'The charge point accepted the request. Charging starts once the cable is locked in.',
    rejectedBody: 'The charge point replied “{status}”. Try another connector, or start the session at the unit.',
  },


  auth: {
    checkFields: 'Please check the highlighted fields',
    networkError: 'We could not reach the server. Check your connection and try again.',
    loadingForm: 'Loading the form',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Password',
    nameLabel: 'Full name',
    phoneLabel: 'Phone number',
    phonePlaceholder: '9911 2233',
    phoneHint:
      'Optional. Used for SMS reset codes — type your local number and the country code is added for you.',
    passwordHint: 'At least 8 characters, including a letter and a number.',
    confirmPasswordLabel: 'Confirm password',
    devHelper: 'Development helper',
    devHintBody:
      'Mail and SMS delivery are not configured yet, so the secret is shown here instead of being sent. This panel disappears once EMAIL_PROVIDER and SMS_PROVIDER are configured, and it never renders in production.',
    yourCodeIs: 'Your code is',

    login: {
      metaTitle: 'Sign in',
      metaDescription:
        'Sign in to your charging account to start sessions and see your history.',
      title: 'Sign in',
      subtitle: 'Reach your charging account, sessions and receipts.',
      footerPrompt: 'Trouble signing in?',
      getHelp: 'Get help',
      failed: 'We could not sign you in.',
      accountReady: 'Your account is ready',
      passwordChanged: 'Password changed',
      forgotPassword: 'Forgot your password?',
      noAccount: 'No account yet?',
      keepSignedIn: 'Keep me signed in',
      submit: 'Sign in',
      newHere: 'New here?',
      createAccount: 'Create an account',
    },

    register: {
      metaTitle: 'Create account',
      metaDescription:
        'Create a charging account to start sessions and keep your receipts in one place.',
      title: 'Create your account',
      subtitle: 'It takes a minute, and you can charge straight afterwards.',
      footerPrompt: 'Questions first?',
      readHelp: 'Read the help pages',
      failed: 'We could not create your account.',
      haveAccount: 'Already have an account?',
      submit: 'Create account',
      signInInstead: 'Sign in instead',
      agreePrefix: 'I agree to the',
      agreeMiddle: 'and the',
      agreeSuffix: '.',
    },

    forgot: {
      metaTitle: 'Forgot password',
      metaDescription: 'Send yourself a reset link by email or a 6-digit code by SMS.',
      title: 'Reset your password',
      subtitle: 'Tell us how to reach you and we will send the next step.',
      footerPrompt: 'Still stuck?',
      failed: 'We could not send the reset instructions.',
      identifierLabel: 'Email or phone number',
      identifierHint: 'Whichever you used when you created the account.',
      identifierPlaceholder: 'you@example.com or 9911 2233',
      channelLabel: 'How should we send it?',
      channelHint: 'An email carries a reset link; an SMS carries a 6-digit code.',
      channelAuto: 'Whichever suits my account',
      channelEmail: 'Email me a link',
      channelSms: 'Text me a code',
      sent: 'If that account exists, reset instructions are on their way.',
      checkPhone: 'Check your phone',
      checkEmail: 'Check your email',
      checkMessages: 'Check your messages',
      submit: 'Send reset instructions',
      tryDifferent: 'Try a different address',
      rememberedIt: 'Remembered it?',
    },

    reset: {
      metaTitle: 'Choose a new password',
      metaDescription: 'Set a new password using your reset link or the code we texted you.',
      title: 'Choose a new password',
      subtitle: 'Pick something you have not used here before.',
      footerPrompt: 'Changed your mind?',
      backToSignIn: 'Back to sign in',
      failed: 'We could not change your password.',
      needPhone: 'Enter the phone number you used',
      needPhoneToResend: 'Enter your phone number so we know where to text the code',
      codeLabel: '6-digit code',
      codeHint: 'It expires 10 minutes after we send it.',
      newPasswordLabel: 'New password',
      confirmNewLabel: 'Confirm new password',
      resent: 'If that number is on file, a new code is on its way.',
      resendFailed: 'We could not send a new code just now.',
      retryShortly: 'We could not reach the server. Try again shortly.',
      passwordChanged: 'Password changed',
      submit: 'Change my password',
      resend: 'Send a new code',
    },

    verify: {
      metaTitle: 'Confirm your email',
      metaDescription: 'Confirm the email address on your charging account.',
      title: 'Confirm your email',
      subtitle: 'This only takes a moment — you do not need to do anything else.',
      confirming: 'Confirming your email address…',
      missingToken:
        'This link is missing its confirmation token. Open the link from the email again.',
      invalidToken: 'This confirmation link is no longer valid. It may have expired already.',
      confirmed: 'Email confirmed',
      failedTitle: 'We could not confirm this link',
      signInFirst: 'We can only send a new link to a signed-in account. Sign in first, then ask again.',
      resendFailed: 'We could not send a new link just now. Try again shortly.',
      resent: 'A new confirmation link is on its way.',
      retryShortly: 'We could not reach the server. Try again shortly.',
      resend: 'Send a new link',
      confirmedBody:
        'Thanks — your address is verified, so charging receipts and account notices can reach you.',
      goToAccount: 'Go to your account',
      needSomethingElse: 'Need something else?',
    },
  },

  pricing: {
    metaTitle: 'Pricing',
    metaDescription:
      'Charging is billed per kilowatt-hour. Each charge point has its own tariff, set by the operator and shown before you plug in.',
    title: 'Pricing',
    intro:
      'You pay for the energy you take, measured in kilowatt-hours. There is no single network price: every charge point carries its own tariff, set by the operator who runs it. The tariff that applies to you is always shown on the station page before you start.',
    howTitle: 'How a charge is priced',
    energyTitle: 'Energy, not time',
    energyBody:
      'The charge point meters how much energy your car actually accepted. The cost of a session is that figure multiplied by the tariff of the charge point.',
    perPointTitle: 'The tariff is per charge point',
    perPointBody:
      'Operators set it individually, so a fast roadside charger and a slow one in a car park will not cost the same. A charge point with no tariff configured shows a dash instead of a price.',
    shownTitle: 'Shown before you plug in',
    shownBodyPrefix: 'Open a station from',
    shownBodySuffix: 'to see its current tariff, plug types and live availability.',
    recordedTitle: 'Paid from your wallet',
    recordedBody:
      'Top your wallet up with QPay, and the cost of each completed session is taken from that balance automatically. Every charge is listed in your wallet history.',
    notesTitle: 'Worth knowing',
    note1:
      'There are no subscriptions or memberships. You only pay for the energy you actually take.',
    note2:
      'Money is only ever taken by QPay, in your own banking app. This site never sees your card details.',
    note3:
      'Parking charges, if the site owner levies any, are separate from the charging tariff and are not shown here.',
    currentTitle: 'Current tariffs',
    pricedCount: '{priced} of {total} charge points publish a price per kilowatt-hour.',
    noneCount: 'Prices are published by each operator as they configure their charge points.',
    demoBody:
      'The charging network is not reachable, so the prices below come from the built-in demo network. They are not real tariffs.',
    failedTitle: 'Tariffs unavailable',
    failedBody:
      'We could not reach the charging network to read current prices. Please try again in a few minutes.',
    emptyBody: 'No charge points are published yet, so there is nothing to price.',
    caption: 'Charge points with their price per kilowatt-hour and maximum power',
    colChargePoint: 'Charge point',
    colPlugs: 'Plugs',
    colMaxPower: 'Max power',
    colPrice: 'Price per kWh',
    footnote:
      'Prices are read from the charging network each time this page loads. An operator can change a tariff at any time; the figure shown on the station page immediately before you start is the one that applies.',
  },

  help: {
    metaTitle: 'Help',
    metaDescription:
      'Answers to the common questions about finding a charger, plug types, charge tags, the wallet, passwords and offline stations.',
    title: 'Help',
    intro:
      'The questions drivers ask most often about {brand}. If your answer is not here, the contact details are at the bottom of the page.',
    faqTitle: 'Common questions',

    q1: 'How do I find a charger?',
    a1: 'Open “Find a charger”. You get every charge point on the network with its live plug status. Search by name or address, or filter by plug type, minimum power and whether a plug is free right now. If you allow the browser to share your location, the list is sorted by distance. Opening a station gives you its address, tariff, each individual plug and a link to directions.',
    q2: 'What does the status on a station mean?',
    a2: '“Available now” means at least one plug is free and working. “All plugs in use” means the charge point is online but every plug is occupied, reserved or out of order. “Offline” means the charge point is not currently talking to the network. Individual plugs also report their own state, such as Preparing, Charging or Out of order.',
    q3: 'What is a charge tag, and why should I link one?',
    a3: 'A charge tag is the RFID card or fob you hold against the reader to authorise a charge. Add its identifier under “My account” and your charging history appears here — energy delivered, duration and cost per session. A linked tag also spends from your wallet balance. You can link more than one tag, and remove one at any time.',
    q4: 'How does the wallet work?',
    a4: 'Top your wallet up with QPay — pick one of the preset amounts or type your own — and scan the QR with your banking app. The balance updates as soon as QPay confirms the payment. When a charging session ends, its cost is taken from that balance automatically and listed in your wallet history. This site never sees your card details; the payment happens entirely inside your banking app.',
    q5: 'How do I reset my password?',
    a5: 'Go to “Forgot password” and enter the email address or phone number on your account. A link sent by email is valid for 30 minutes; a six-digit code sent by SMS is valid for 10 minutes. For your safety the page says the same thing whether or not an account exists, so check your inbox or messages rather than the wording on screen. Changing your password signs you out everywhere else.',
    q6: 'Why does a station show as offline?',
    a6: 'Charge points check in with the network regularly. When those check-ins stop — a dropped mobile signal, a site power cut, or maintenance — the network can no longer tell what the plugs are doing, so the station is marked offline. An offline charge point often still works locally with an RFID card, so it can be worth trying if you are already there. The session is reported once the charge point reconnects.',
    q7: 'Can I start a charge from this app?',
    a7: 'Only where the operator has switched remote start on and you have a linked charge tag that the network recognises. When it is available you will see a start button on the station page once you are signed in; otherwise use your card at the charge point as usual.',
    q8: 'My session is missing from my history',
    a8: 'Sessions are matched to you by charge tag, so check that the tag you used is linked under “My account” — the identifier has to match exactly, including case. A session started while the charge point was offline only appears once that charge point reconnects and uploads it.',

    plugsTitle: 'Plug types',
    plugsIntro:
      'Your car accepts one or two of these. Check the plug type on a station page before you travel to it — a fast charger with the wrong socket is no use.',
    plug1: 'Type 2 (Mennekes)',
    plug1Body:
      'The standard AC plug in Europe and the default socket on most public AC posts. Usually 7 kW to 22 kW — good for a long stay, not for a quick top-up.',
    plug2: 'CCS2 (Combo 2)',
    plug2Body:
      'A Type 2 plug with two extra DC pins below it. The common DC fast standard, typically 50 kW and upwards, with the cable attached to the charge point.',
    plug3: 'CHAdeMO',
    plug3Body:
      'The older Japanese DC fast standard, still used by the Nissan Leaf and several imported models. Normally up to 50–100 kW.',
    plug4: 'GB/T',
    plug4Body:
      'The Chinese DC fast standard, fitted to many vehicles imported from China. Physically incompatible with CCS2 and CHAdeMO.',
    plug5: 'Type 1 (J1772)',
    plug5Body:
      'A single-phase AC plug found on older Japanese and North American cars. AC only, so charging is slower.',
    plug6: 'Schuko',
    plug6Body:
      'An ordinary domestic socket. A last resort at roughly 2–3 kW; useful overnight, not for a stop on a journey.',

    contactTitle: 'Contact',
    contactBody:
      'For a fault at a charge point — a plug that will not release, a damaged cable, a screen that is dark — quote the charge point name shown on this site and the identifier printed on the unit itself.',
    contactPlaceholderTitle: 'Placeholder',
    contactPlaceholderBody:
      'Support contact details have not been configured for this deployment yet. Until the operator publishes them here, use the telephone number or email printed on the charge point.',

    safetyTitle: 'Safety at a charge point',
    safety1: 'Do not use a cable or plug that is cracked, burnt or wet inside.',
    safety2: 'Stop the session before unplugging; do not pull a cable under load.',
    safety3: 'Keep the cable off walkways so nobody trips over it.',
    safety4: 'In an emergency press the stop button on the unit and call the operator.',

    moreTitle: 'More',
    howPricingWorks: 'How pricing works',
  },

  terms: {
    metaTitle: 'Terms of service (draft)',
    metaDescription:
      'Draft terms of service for the charging app. To be replaced by the operator’s own legal text before launch.',
    draftTitle: 'Draft — not yet legally binding',
    draftBody:
      'This is placeholder text written to give the app a complete set of pages. It must be replaced by the operator’s own terms of service, reviewed by a lawyer, before the service is opened to the public.',
    title: 'Terms of service',
    intro: 'The rules for using the {brand} website and the charging network it describes.',
    seeAlsoPrefix: 'See also the',
    privacyLink: 'privacy notice',
    seeAlsoSuffix: ', which explains what this app stores about you.',

    s1: 'About this service',
    s1a:
      '{brand} is a website that shows the charge points of a charging network, their live availability and their tariffs, and lets a driver keep an account so that charging sessions can be listed in one place. The charge points themselves are owned and run by the network operator.',
    s1b:
      'Using this site does not create a charging contract on its own. What you owe for a charge, and to whom, is governed by the arrangement you have with the operator.',

    s2: 'Your account',
    s2a:
      'You must give a working email address and choose a password of at least eight characters containing a letter and a digit. Keep your password to yourself; anyone who has it can see your charging history and spend your wallet balance. Tell the operator promptly if you think someone else has access.',
    s2b:
      'One account is for one person. You may link the identifiers of charge tags that belong to you. Do not link a tag that is not yours: doing so would expose another driver’s sessions to you and may be treated as misuse.',

    s3: 'Using a charge point',
    s3a:
      'Follow the instructions displayed on the unit and any site rules where it stands. Do not use equipment that appears damaged. Do not attempt to open, modify or interfere with a charge point, and do not obstruct a charging bay when you are not charging.',
    s3b:
      'You are responsible for your vehicle and its charging equipment, and for whether a particular plug and power level are suitable for it.',

    s4: 'Availability and accuracy',
    s4a:
      'Availability, plug status and tariffs are shown as the charging network last reported them. A charge point that has lost contact with the network is marked offline and its plug status is not known. Information may be out of date or incomplete, and a charge point may be occupied or out of service by the time you arrive.',
    s4b:
      'The service is provided as it stands. It may be interrupted for maintenance, and features may change or be withdrawn.',

    s5: 'Prices, wallet and payment',
    s5a:
      'Each charge point has its own price per kilowatt-hour, set by the operator, as described on the pricing page.',
    s5b:
      'A wallet is a prepaid balance held in your name. It is topped up through QPay, in your own banking app; this site never receives or stores your card details. The cost of a completed charging session is deducted from that balance, and every movement is listed in your wallet history.',
    s5c:
      'If a session costs more than the balance available, the shortfall is recorded against the wallet and settled by your next top-up. A wallet balance is not transferable and carries no interest. Refunds are handled by the operator.',

    s6: 'Acceptable use',
    s6a:
      'Do not attempt to gain access to accounts or systems that are not yours, scrape or overload the service, or use it to break the law. Automated access to the site’s interfaces is rate limited and may be blocked.',

    s7: 'Liability',
    s7a:
      '[Placeholder — the operator’s own limitation of liability, warranty and indemnity wording belongs here, drafted to the law that applies to the operator. Nothing in this draft should be relied on as a limitation of liability.]',

    s8: 'Ending your access',
    s8a:
      'You may stop using the service at any time. The operator may suspend an account that is being used in breach of these terms or in a way that endangers people or equipment. Ask the operator about any remaining wallet balance before you close an account.',

    s9: 'Changes to these terms',
    s9a:
      'These terms may change. The version published on this page is the one that applies. Where a change materially affects you, the operator should tell you before it takes effect.',

    s10: 'Governing law and contact',
    s10a:
      '[Placeholder — the operator must state the governing law, the competent courts, the legal entity behind the service, its registered address and a contact address for legal notices.]',
  },

  privacy: {
    metaTitle: 'Privacy notice (draft)',
    metaDescription:
      'Draft privacy notice listing exactly what this charging app stores about a driver. To be replaced by the operator’s own text before launch.',
    draftTitle: 'Draft — not yet a legal notice',
    draftBody:
      'This is placeholder text written so the app has a complete set of pages. It describes accurately what the software stores, but it must be replaced by the operator’s own privacy notice, reviewed by a lawyer, before the service is opened to the public.',
    title: 'Privacy notice',
    intro: 'What {brand} stores about you, why, and what you can do about it.',
    storedTitle: 'What is stored',
    seeAlsoPrefix: 'See also the',
    termsLink: 'terms of service',

    itemName: 'Name',
    itemNameBody: 'What you typed when you created the account. Used to address you in the interface.',
    itemEmail: 'Email address',
    itemEmailBody:
      'Your sign-in identifier, and where password reset links and verification links are sent. Stored in lower case.',
    itemPhone: 'Phone number (optional)',
    itemPhoneBody:
      'Only if you provide one. Stored in international format so it can be matched reliably, and used to send a six-digit code when you verify the number or reset your password by SMS.',
    itemPassword: 'Password hash',
    itemPasswordBody:
      'Your password is never stored. What is kept is a bcrypt hash of it, from which the password cannot be recovered.',
    itemTags: 'Linked charge tag identifiers',
    itemTagsBody:
      'The identifiers of the RFID cards or fobs you have linked to the account. They are what lets the app find the charging sessions that belong to you, and what ties a charge to your wallet.',
    itemState: 'Account state',
    itemStateBody:
      'Whether your email and phone have been verified, your language preference, whether the account is active, when it was created and when you last signed in.',
    itemTokens: 'Verification and reset tokens',
    itemTokensBody:
      'While a reset link or a one-time code is outstanding we store a hash of it, the address it was sent to, its expiry time and how many times it has been tried. The token itself is not kept.',
    itemWallet: 'Wallet balance and ledger',
    itemWalletBody:
      'Your prepaid balance and every movement against it — top-ups, charges, refunds and corrections — with the amount, the time and what it referred to. Held by the charging network, not in this app’s database. No card or bank details are stored anywhere in this system: a top-up is authorised entirely inside your banking app, and QPay tells us only that an invoice was paid.',
    itemSessions: 'Charging session records',
    itemSessionsBody:
      'Start and stop time, charge point, connector, charge tag, energy delivered and cost. These are held by the charging network, not by this app: they are fetched for your linked tags when you open your history and are not copied into this app’s database.',

    s1: 'Why this information is held',
    s1a: 'To let you sign in and to keep your account secure.',
    s1b: 'To send the emails and text messages that the sign-up and reset flows require.',
    s1c: 'To show you the charging sessions recorded against the charge tags you have linked.',
    s1d: 'To hold your prepaid balance and settle the cost of a completed charging session against it.',
    s1e: 'To rate limit sign-in, reset and top-up attempts so accounts cannot be attacked in bulk.',

    s2: 'Where it is stored',
    s2a:
      'Driver accounts live in the operator’s MongoDB database, in collections of their own, separate from the operator’s own staff accounts. In development the app can fall back to a JSON file on the developer’s machine instead; that fallback is disabled in production.',
    s2b:
      'Charging records and wallet balances live in the charging network’s own database. This app reads them over a server-to-server connection; your browser never talks to the charging network directly.',

    s3: 'Cookies',
    s3a:
      'Two cookies are used. A session cookie is set only after you sign in: it holds a signed token, is marked HttpOnly so page scripts cannot read it, is restricted to same-site navigation, and is sent only over HTTPS in production. A second cookie records your language choice; it holds nothing but the language code and is readable by the page.',
    s3b:
      'There are no advertising or analytics cookies on this site. Map tiles are loaded from a third-party tile server, which will see your IP address.',

    s4: 'Who it is shared with',
    s4a:
      'Your charge tag identifiers are sent to the charging network in order to look up your sessions and your balance. Your email address is passed to the mail server the operator has configured, and your phone number to the SMS gateway, purely to deliver the messages you have asked for.',
    s4b:
      'When you top up, the amount and an invoice reference are sent to QPay so it can create the payment. QPay may also receive the phone number or email on your account as the invoice reference.',
    s4c:
      'Nothing is sold, and nothing is shared for advertising. [Placeholder — the operator must name the actual mail and SMS providers used, and any hosting provider, before launch.]',

    s5: 'How long it is kept',
    s5a:
      'Account information is kept while the account exists. Reset links expire after 30 minutes, SMS codes after 10 minutes, and email verification links after 24 hours; expired tokens are no longer usable. Wallet ledger entries are financial records and are kept for as long as the operator’s accounting obligations require. [Placeholder — the operator must state its own retention period for closed accounts and for charging records.]',

    s6: 'Your choices',
    s6a:
      'You can change your name, phone number and language, and add or remove charge tags, from your account. Removing a tag stops its sessions being shown to you; it does not delete the network’s record of them.',
    s6b:
      'Closing an account is not yet self-service in this app — contact the operator to have it done, and to ask about any remaining wallet balance. [Placeholder — the operator must set out the access, correction, deletion and complaint rights that apply in its jurisdiction, and who to contact to exercise them.]',
  },

} as const;

/**
 * Widens the literal types `as const` gives `en` ('Sign in') back to `string`,
 * while keeping the key structure. Without this every translation is a type
 * error, because 'Нэвтрэх' is not assignable to the literal type '"Sign in"'.
 * Missing or misspelled keys in `mn` are still caught.
 */
type Widen<T> = T extends string ? string : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;

export const mn: Dictionary = {
  common: {
    appTagline: 'Машинаа санаа амар цэнэглээрэй',
    signIn: 'Нэвтрэх',
    signOut: 'Гарах',
    createAccount: 'Бүртгүүлэх',
    myAccount: 'Миний бүртгэл',
    save: 'Хадгалах',
    saving: 'Хадгалж байна…',
    saved: 'Хадгаллаа',
    cancel: 'Цуцлах',
    close: 'Хаах',
    back: 'Буцах',
    retry: 'Дахин оролдох',
    loading: 'Ачааллаж байна…',
    search: 'Хайх',
    clear: 'Цэвэрлэх',
    remove: 'Устгах',
    add: 'Нэмэх',
    confirm: 'Баталгаажуулах',
    optional: 'заавал биш',
    required: 'заавал',
    somethingWentWrong: 'Алдаа гарлаа. Дахин оролдоно уу.',
    networkError: 'Сервертэй холбогдож чадсангүй. Холболтоо шалгаад дахин оролдоно уу.',
    toggleNav: 'Цэс нээх',
    toggleTheme: 'Загвар солих',
    language: 'Хэл',
  },

  nav: {
    home: 'Нүүр',
    stations: 'Цэнэглэх станц',
    pricing: 'Үнэ тариф',
    help: 'Тусламж',
  },

  footer: {
    rights: '© {year} {brand}. OCPP 1.6J дээр суурилсан цэнэглэх сүлжээ.',
    terms: 'Үйлчилгээний нөхцөл',
    privacy: 'Нууцлалын бодлого',
  },

  status: {
    connector: {
      Available: 'Сул байна',
      Preparing: 'Бэлтгэж байна',
      Charging: 'Цэнэглэж байна',
      SuspendedEV: 'Машин түр зогсоосон',
      SuspendedEVSE: 'Станц түр зогсоосон',
      Finishing: 'Дуусгаж байна',
      Reserved: 'Захиалагдсан',
      Unavailable: 'Боломжгүй',
      Faulted: 'Эвдэрсэн',
    },
    availability: {
      available: 'Одоо сул байна',
      busy: 'Бүх холбогч завгүй',
      offline: 'Холбогдоогүй',
      unknown: 'Төлөв тодорхойгүй',
    },
  },
  account: {
    nav: {
      overview: 'Ерөнхий',
      wallet: 'Хэтэвч',
      security: 'Аюулгүй байдал',
      sessions: 'Цэнэглэлтийн түүх',
    },
    title: 'Миний бүртгэл',
    signedInAs: '{email}-ээр нэвтэрсэн',
    verified: 'Баталгаажсан',
    notVerified: 'Баталгаажаагүй',
    manage: 'Удирдах',
    statusTitle: 'Бүртгэлийн төлөв',
    emailLabel: 'И-мэйл хаяг',
    confirmEmail: 'И-мэйл баталгаажуулах',
    mobileLabel: 'Гар утасны дугаар',
    noNumberYet: 'Дугаар оруулаагүй байна',
    verifyNumber: 'Дугаар баталгаажуулах',

    profile: {
      title: 'Таны мэдээлэл',
      nameLabel: 'Нэр',
      phonePlaceholder: '+976 9911 2233',
      languageLabel: 'Хэл',
      languageHint: 'Танд илгээх и-мэйл, мессежид ашиглана.',
      saveFailed: 'Мэдээллийг тань хадгалж чадсангүй. Дахин оролдоно уу.',
      networkError: 'Сервертэй холбогдож чадсангүй. Холболтоо шалгаад дахин оролдоно уу.',
    },

    password: {
      title: 'Нууц үг',
      currentLabel: 'Одоогийн нууц үг',
      newLabel: 'Шинэ нууц үг',
      confirmLabel: 'Шинэ нууц үгээ давтах',
      changed: 'Нууц үг тань солигдлоо. Бусад төхөөрөмжөөс гарсан байна.',
      failed: 'Нууц үгийг тань солиж чадсангүй. Дахин оролдоно уу.',
    },

    idTags: {
      title: 'Цэнэглэх картууд',
      body:
        'Цэнэглэх карт гэдэг нь цэнэглэгч таныг таних RFID карт эсвэл аппын код юм; үүнийг цэнэглэлтийн оператор олгож, кодыг карт дээр хэвлэдэг.',
      none: 'Одоогоор холбосон карт алга байна.',
      addLabel: 'Цэнэглэх карт нэмэх',
      addHint: 'Карт дээр хэвлэгдсэн кодыг яг байгаагаар нь оруулна уу.',
      addSubmit: 'Карт холбох',
      enterCode: 'Цэнэглэх картныхаа кодыг оруулна уу',
      linkFailed: 'Тухайн картыг холбож чадсангүй. Дахин оролдоно уу.',
      unlinkFailed: 'Тухайн картын холбоосыг салгаж чадсангүй. Дахин оролдоно уу.',
      linked: '{tag} карт таны бүртгэлд холбогдлоо.',
      unlinked: '{tag} картын холбоос таны бүртгэлээс салгагдлаа.',
      unlink: 'Салгах',
      unlinkConfirm: 'Энэ картыг салгах уу?',
      unlinkYes: 'Тийм, салгая',
      unlinkSr: ' {tag} цэнэглэх карт',
      manage: 'Цэнэглэх картаа удирдах',
    },

    verification: {
      emailConfirmed:
        '{email} баталгаажсан байна. Үүгээр цэнэглэлтийн баримт, бүртгэлийн мэдэгдэл илгээнэ.',
      emailPending:
        'Цэнэглэлтийн баримт, бүртгэлийн мэдэгдэл илгээх боломжтой болгохын тулд {email} хаягаа баталгаажуулна уу. Илгээх холбоос 24 цагийн турш хүчинтэй.',
      resendEmail: 'Баталгаажуулах и-мэйл дахин илгээх',
      emailSendFailed: 'Баталгаажуулах и-мэйл илгээж чадсангүй. Дахин оролдоно уу.',
      verificationToken: 'Баталгаажуулах код',
      verificationCode: 'Баталгаажуулах код',
      devCaveat: 'Хөгжүүлэлтийн горим — мессеж илгээх тохиргоо хийгдээгүй тул энд харуулав.',
      phoneTitle: 'Утасны дугаар',
      phoneConfirmed:
        '{phone} баталгаажсан тул анхаарал шаардсан цэнэглэлтийн талаар танд мессеж илгээх боломжтой. Өөр дугаар ашиглах бол «Ерөнхий» хэсэгт солиод эндээс баталгаажуулна уу.',
      overview: 'Ерөнхий',
      phonePending:
        'Анхаарал шаардсан цэнэглэлтийн талаар мессеж хүлээн авах, мөн SMS-ээр нууц үгээ сэргээхийн тулд гар утасны дугаараа баталгаажуулна уу.',
      phoneHint: 'Өөр дугаар баталгаажуулах бол энд тэр дугаараа оруулна уу.',
      sendCode: 'Код илгээх',
      sendNewCode: 'Шинэ код илгээх',
      codeSendFailed: 'Кодыг илгээж чадсангүй. Дахин оролдоно уу.',
      codeLabel: '6 оронтой код',
      codeSentTo: '{destination} руу илгээлээ. 10 минутын дараа хүчингүй болно.',
      codeWrong: 'Энэ код тохирсонгүй. Дахин оролдоно уу.',
      phoneVerified: 'Таны гар утасны дугаар баталгаажлаа.',
      networkError: 'Сервертэй холбогдож чадсангүй. Холболтоо шалгаад дахин оролдоно уу.',
    },

    sessions: {
      title: 'Цэнэглэлтийн түүх',
      unavailable: 'Цэнэглэлтийн түүх боломжгүй байна',
      unavailableBody:
        'Цэнэглэх сүлжээтэй одоохондоо холбогдож чадсангүй тул таны цэнэглэлтүүд харагдахгүй байна. Хэдэн минутын дараа дахин оролдоно уу.',
      empty:
        'Бүртгэлдээ цэнэглэх карт холбож, цэнэглэгч дээр ашигласны дараа цэнэглэлтийн түүх энд харагдана.',
      count: '{count} цэнэглэлт',
      connector: '{id}-р холбогч',
      connectorHeader: 'Холбогч',
      started: 'Эхэлсэн',
      duration: 'Үргэлжлэх хугацаа',
      energy: 'Эрчим хүч',
      cost: 'Төлбөр',
      rightNow: 'Одоо',
      station: 'Станц',
      status: 'Төлөв',
      inProgress: 'Үргэлжилж байна',
      completed: 'Дууссан',
      rejected: 'Татгалзсан',
      stop: 'Зогсоох',
      stopping: 'Зогсоож байна…',
      stopConfirm: 'Энэ цэнэглэлтийг зогсоох уу?',
      stopYes: 'Тийм, зогсооё',
      stopFailed: 'Цэнэглэлтийг зогсоож чадсангүй. Дахин оролдоно уу.',
      stopAccepted: 'Зогсоох хүсэлтийг хүлээн авлаа. Цэнэглэгч цэнэглэлтийг дуусгаж байна.',
      stopReplied: 'Цэнэглэгч «{status}» гэж хариулав.',
      stopSr: ' {id} дугаартай цэнэглэлт',
      keepCharging: 'Үргэлжлүүлэх',
      stopSrAt: ' {station} дээрх цэнэглэлт',
      actions: 'Үйлдэл',
      caption: 'Таны цэнэглэлтүүд, сүүлийнхээс эхлэн',
      stopAnswered:
        'Цэнэглэгч «{status}» гэж хариулав. Цэнэглэлт үргэлжилсээр байвал станц дээр нь зогсооно уу.',
    },
  },

  wallet: {
    title: 'Хэтэвч',
    subtitle: 'QPay-ээр үлдэгдлээ цэнэглээд цэнэглэлтийн төлбөрөө автоматаар төлөөрэй.',
    balance: 'Үлдэгдэл',
    balanceHint: 'Цэнэглэлтэд зарцуулах боломжтой',
    debt: 'Төлөх дүн',
    debtHint: 'Цэнэглэлтийн төлбөр үлдэгдлээс давсан байна. Цэнэглэж төлнө үү.',
    frozen: 'Энэ хэтэвч түр хаагдсан байна. Операторт хандана уу.',
    toppedUp: 'Нийт цэнэглэсэн',
    spent: 'Нийт зарцуулсан',
    linkedTags: 'Энэ үлдэгдлийг ашиглах картууд',
    noLinkedTags: 'Холбосон карт алга байна. «Ерөнхий» хэсгээс картаа холбоно уу.',
    lowBalance: 'Таны үлдэгдэл {amount}-өөс бага байна. Цэнэглэхийн өмнө хэтэвчээ цэнэглэнэ үү.',
    unavailable: 'Хэтэвчийн үйлчилгээ түр боломжгүй байна. Хэсэг хугацааны дараа дахин оролдоно уу.',

    topUp: {
      title: 'Цэнэглэх',
      chooseAmount: 'Дүнгээ сонгоно уу',
      customAmount: 'Эсвэл дүнгээ оруулна уу',
      customPlaceholder: 'жишээ нь 15000',
      amountLabel: 'Дүн (₮)',
      amountRange: '{min} – {max} хооронд',
      submit: 'Цэнэглэх',
      submitting: 'Нэхэмжлэх үүсгэж байна…',
      invalidAmount: 'Дүнгээ оруулна уу',
      tooSmall: 'Хамгийн бага цэнэглэлт {min}',
      tooLarge: 'Хамгийн их цэнэглэлт {max}',
      disabled: 'Цэнэглэх үйлчилгээ түр боломжгүй байна.',
    },

    invoice: {
      title: 'Уншуулж төлнө үү',
      amount: 'Төлөх дүн',
      instruction: 'QR кодыг банкны аппаараа уншуулах эсвэл доороос банкаа сонгоно уу.',
      openBank: 'Банкны апп нээх',
      waiting: 'Төлбөр хүлээж байна…',
      checkNow: 'Төлбөрөө хийсэн',
      checking: 'Шалгаж байна…',
      paid: '{amount} таны хэтэвчид нэмэгдлээ.',
      newBalance: 'Шинэ үлдэгдэл: {balance}',
      expired: 'Энэ нэхэмжлэхийн хугацаа дууссан байна. Дахин эхлүүлнэ үү.',
      canceled: 'Энэ нэхэмжлэх цуцлагдсан байна.',
      failed: 'Нэхэмжлэх үүсгэж чадсангүй. Дахин оролдоно уу.',
      notPaidYet: 'Төлбөр хараахан ирээгүй байна. Түр хүлээгээд дахин шалгана уу.',
      startOver: 'Өөр дүнгээр цэнэглэх',
      expiresAt: '{time} хүртэл хүчинтэй',
      qrAlt: 'QPay төлбөрийн QR код',
    },

    history: {
      title: 'Хэтэвчийн хөдөлгөөн',
      empty: 'Одоогоор хөдөлгөөн алга байна.',
      viewAll: 'Бүгдийг харах',
      type: {
        TOPUP: 'Цэнэглэлт',
        CHARGE: 'Цэнэглэлтийн төлбөр',
        REFUND: 'Буцаалт',
        ADJUSTMENT: 'Тохируулга',
        BONUS: 'Урамшуулал',
      },
      balanceAfter: 'Үлдэгдэл: {balance}',
    },
  },

  home: {
    map: {
      title: 'Шууд газрын зураг',
      subtitle: 'Сүлжээний холбогчийн төлөв бодит цагт',
      filterLabel: 'Шүүлтүүр',
      groupPower: 'Хүчин чадал',
      groupCurrent: 'Гүйдэл',
      groupConnector: 'Холбогч',
      groupStatus: 'Төлөв',
      groupPrice: 'Үнэ',
      optionAny: 'Бүгд',
      currentDc: 'DC хурдан',
      currentAc: 'AC',
      powerAtLeast: '{power}+',
      priceUpTo: '{price} хүртэл',
      clearAll: 'Цэвэрлэх',
      clearAllHint: 'Бүх шүүлтүүрийг цэвэрлэх',
      count: '{count} станц',
      showList: 'Жагсаалт · {count}',
      hideList: 'Жагсаалтыг хаах',
      noResults: 'Энэ шүүлтүүрт тохирох станц олдсонгүй.',
      listCapped: '{total} станцаас {shown}-г харуулж байна',
      seeAllList: 'Бүтэн хайлт нээх',
      locate: 'Ойролцоо',
      locating: 'Хайж байна…',
      resetView: 'Бүх станцыг багтаах',
      directions: 'Замын заавар',
      clusterAria: 'Энэ хэсэгт {count} станц',
      zoomIn: 'Томруулах',
      zoomOut: 'Жижигрүүлэх',
    },
    heroBadge: 'Цахилгаан автомашины цэнэглэх сүлжээ',
    title: 'Замдаа сааталгүй — Найдвартай, түргэн цэнэглэлт',
    subtitle:
      'Ойролцоох цэнэглэх станцуудын байршил, холбогчийн сул төлөв, хүчин чадал болон тарифын мэдээллийг бодит цаг хугацаанд харна уу.',
    statFastTitle: 'Өндөр чадлын цэнэглэгч',
    statFastValue: '180 кВт хүртэл',
    statLiveTitle: 'Сул төлөв байдал',
    statLiveValue: '24/7 бодит цагт',
    statPayTitle: 'Төлбөрийн шийдэл',
    statPayValue: 'QPay хэтэвч',
    networkTitle: 'Сүлжээний цэнэглэх станцууд',
    networkSubtitle:
      'Манай сүлжээнд холбогдсон станцуудын одоогийн төлөв байдал. Холбогчийн төрөл, хүчин чадал, зайнаас хамааруулан шүүх боломжтой.',
    seeAll: 'Бүх станцыг харах',
    noStations: 'Одоогоор идэвхтэй цэнэглэх станцын мэдээлэл олдсонгүй. Та түр хүлээгээд дахин оролдоно уу.',
    featuresBadge: 'Давуу талууд',
    featuresTitle: 'Ухаалаг цэнэглэгч сүлжээний боломжууд',
    feature1Title: 'Бодит цагийн сул төлөв',
    feature1Body: 'Станц дээр очихоос өмнө холбогч сул байгаа эсэхийг урьдчилан харна.',
    feature2Title: 'Өндөр чадлын цэнэглэгч',
    feature2Body: '180кВт хүртэлх өндөр хурдны тогтмол гүйдлийн (DC) технологи.',
    feature3Title: 'QPay цахим хэтэвч',
    feature3Body: 'Хэтэвчээ хэдхэн секундэд цэнэглэж, төлбөрөө саадгүй барагдуулна.',
    feature4Title: 'Ил тод үнэ тариф',
    feature4Body: 'кВт·ц тутамд тооцох тодорхой үнэ, нууц шимтгэлгүй.',
    howItWorksBadge: 'Хялбар, ойлгомжтой',
    howItWorks: 'Үйлчилгээ авах гурван алхам',
    step1Title: '1. Станцаа олох',
    step1Body:
      'Өөрийн байршил эсвэл хаягаар хайн, одоо сул байгаа цэнэглэгч болон холбогчийн төлвийг шууд хараарай.',
    step2Title: '2. Холбогчоо залгах',
    step2Body:
      'Цэнэглэлтийн RFID картаа уншуулах эсвэл гар утасны аппликейшнээр цэнэглэлтийг хялбар эхлүүлнэ.',
    step3Title: '3. Хянаж, төлбөр төлөх',
    step3Body:
      'Цэнэглэх явцад эрчим хүчний зарцуулалт, чадал болон үнийг бодит цагт хянаж, цахим хэтэвчээсээ шууд төлнө.',
    ctaTitle: 'Ухаалаг хэрэглэгч болоход бэлэн үү?',
    ctaBody:
      'Үнэгүй бүртгүүлэн RFID картаа холбож, цахим хэтэвчээ цэнэглэн, төлбөрийн бүх баримтаа нэг дор эмх цэгцтэй хянаарай.',
  },

  errors: {
    loading: 'Ачааллаж байна',
    networkUnreachable:
      'Цэнэглэх сүлжээтэй одоогоор холбогдох боломжгүй байна. Хэсэг хугацааны дараа дахин оролдоно уу.',
    sampleData: 'Жишээ өгөгдөл',
    stationsFailed: 'Цэнэглэх цэгүүдийг ачаалж чадсангүй',
    notFoundTitle: 'Ийм хуудас олдсонгүй',
    notFoundCode: 'Алдаа 404',
    notFoundBody:
      'Холбоос хуучирсан эсвэл заасан цэнэглэх цэг нь нийтлэгдэхээ больсон байж магадгүй.',
    goHome: 'Нүүр хуудас руу очих',
    stillStuck: 'Асуудал үргэлжилж байна уу?',
    readHelp: 'Тусламжийн хуудсыг үзэх',
    errorTitle: 'Алдаа гарлаа',
    errorBody:
      'Энэ хуудсыг ачаалж чадсангүй. Цэнэглэх сүлжээ завгүй эсвэл түр холбогдох боломжгүй байж магадгүй.',
    reference: 'Дугаар {digest} — тусламж авахдаа энэ дугаарыг хэлнэ үү.',
    helpContact: 'Тусламж, холбоо барих мэдээлэл',
  },

  stations: {
    title: 'Цэнэглэх цэг хайх',
    subtitle:
      'Сүлжээний холбогчийн сул байдлыг шууд харна уу. Холбогч, хүчин чадлаар шүүх эсвэл ойр байгаагаар нь эрэмбэлээрэй.',
    metaDescription:
      'Цэнэглэх сүлжээг нэр, холбогч, хүчин чадлаар хайж, одоо аль холбогч сул байгааг харна уу.',
    searchLabel: 'Хайх',
    searchPlaceholder: 'Нэр, хаяг эсвэл таних тэмдэг',
    quickPlaceholder: 'Байршил, станцын нэр эсвэл хаягаар хайх...',
    statusLabel: 'Төлөв',
    anyStatus: 'Бүх төлөв',
    connectorLabel: 'Холбогч',
    anyConnector: 'Бүх холбогч',
    minPowerLabel: 'Хамгийн бага хүчин чадал',
    anyPower: 'Бүх хүчин чадал',
    resultView: 'Үр дүнгийн харагдац',
    list: 'Жагсаалт',
    map: 'Газрын зураг',
    updating: 'Үр дүнг шинэчилж байна',
    noMatchTitle: 'Энэ хайлтад тохирох станц алга',
    noMatchFiltered:
      'Хүчин чадлын хязгаарыг өргөжүүлэх, өөр холбогч сонгох эсвэл шүүлтүүрээ цэвэрлээд бүх сүлжээг харна уу.',
    useMyLocation: 'Ойролцоох станц олох',
    locating: 'Байршлыг тогтоож байна…',
    geoDenied: 'Энэ сайтад байршил хуваалцах хаагдсан байна. Оронд нь нэрээр хайна уу.',
    geoTimeout: 'Байршлыг тогтооход хэт удлаа. Дахин оролдох эсвэл нэрээр хайна уу.',
    geoFailed: 'Таны байршлыг тогтоож чадсангүй. Оронд нь нэрээр хайна уу.',
    geoUnsupported: 'Энэ хөтөч байршил хуваалцах боломжгүй. Оронд нь нэрээр хайна уу.',
    addressMissing: 'Хаяг оруулаагүй байна',
    free: '{available}/{total} сул',
    maxPower: 'Дээд хүчин чадал',
    price: 'Үнэ',
    connectorsTitle: 'Холбогчид',
    detailsTitle: 'Дэлгэрэнгүй',
    hardware: 'Тоног төхөөрөмж',
    chargePoint: 'Цэнэглэх цэг',
    lastSeen: 'Сүүлд холбогдсон',
    onlineNow: 'Одоо холбогдсон',
    notPublished: 'Оруулаагүй байна',
    unreachableTitle: 'Энэ станцтай холбогдох боломжгүй байна',
    backToAll: 'Бүх цэнэглэх цэг рүү буцах',
    directions: 'Замын заавар',
    noConnectors: 'Энэ цэнэглэх цэг холбогчийн мэдээлэл хараахан илгээгээгүй байна.',
    connectorN: '{id}-р холбогч: ',
    plugTypeMissing: 'Холбогчийн төрөл оруулаагүй',
    upToPower: '{power} хүртэл',
    powerMissing: 'Хүчин чадал оруулаагүй',
    outOfService: 'Ашиглалтаас гаргасан',
    nowPower: 'Одоо {power}',
    battery: 'Цэнэг {percent}%',
    nearMe: 'Ойролцоо',
    stopSortingByDistance: 'Зайгаар эрэмбэлэхээ болих',
    clearFilters: 'Шүүлтүүр цэвэрлэх',
    countStations: '{count} станц',
    nearestFirst: ', ойроос нь эхлүүлэн',
    powerOrMore: '{power}-аас дээш',
    searchAria: 'Цэнэглэх станц хайх',
    findChargers: 'Цэнэглэх цэг хайх',
    allChargers: '← Бүх цэнэглэх цэг',
    plugsFree: '{available}/{total} холбогч сул',
    demoBody:
      'Шууд мэдээлэл одоогоор боломжгүй тул энэ хуудсанд жишээ цэнэглэх цэг харагдаж байна. Төлөв, үнэ бодит станцтай таарахгүй байж болно.',
    mapOf: '{name}-ийн газрын зураг',
    perKwh: 'кВт·ц тутамд {price}',
    unreachableBody:
      'Цэнэглэх сүлжээ энэ цэнэглэх цэгийн талаар хариу өгсөнгүй. Холбогдоогүй эсвэл сүлжээ завгүй байж магадгүй.',
    mapAria: 'Цэнэглэх станцуудын газрын зураг',
    viewStation: 'Станцыг үзэх',
  },

  flow: {
    title: 'Цэнэглэлт',
    stepOf: '{total}-аас {n}-р алхам',
    // --- the ordered steps ---
    s1Title: 'Нэвтрэх',
    s1Body: 'Цэнэглэлтийн төлбөр таны бүртгэлээс хасагдах тул эхлээд нэвтэрнэ үү.',
    s2Title: 'Цэнэглэх карт холбох',
    s2Body: 'RFID картан дээрх дугаараа бүртгэлдээ нэмнэ үү. Станц таныг үүгээр таних болно.',
    s3Title: 'Холбогчоо сонгох',
    s3Body: 'Машиндаа тохирох сул холбогчийг сонгоно уу.',
    s4Title: 'Кабелиа залгах',
    s4Body: 'Эхлүүлэхээс өмнө кабелиа машиндаа залгана уу. Үгүй бол станц цоожлохгүй.',
    s5Title: 'Цэнэглэлт эхлүүлэх',
    s5Body: 'Бид станцад хүсэлт илгээнэ. Эцсийн шийдвэрийг станц өөрөө гаргана.',
    s6Title: 'Станцыг хүлээж байна',
    s6Body: 'Станц хүсэлтийг хүлээж авч, кабелиа цоожилж байна. Ихэвчлэн хэдхэн секунд болно.',
    s7Title: 'Цэнэглэж байна',
    s7Body: 'Эрчим хүч дамжиж байна. Та энэ хуудсыг орхиж болно — цэнэглэлт үргэлжилнэ.',
    s8Title: 'Зогсоож байна',
    s8Body: 'Бид станцад зогсоох хүсэлт илгээлээ. Станц цэнэглэлтийг дуусгаж, кабелиа суллана.',
    s9Title: 'Дууслаа',
    s9Body: 'Цэнэглэлт дууссан бөгөөд төлбөр хэтэвчнээс хасагдлаа.',
    // --- states and actions ---
    done: 'Дууссан',
    current: 'Одоо',
    waiting: 'Хүлээгдэж байна',
    startNow: 'Цэнэглэлт эхлүүлэх',
    starting: 'Станцад хүсэлт илгээж байна…',
    stopNow: 'Цэнэглэлт зогсоох',
    stopping: 'Зогсоож байна…',
    liveEnergy: 'Авсан эрчим хүч',
    livePower: 'Одоогийн чадал',
    liveBattery: 'Цэнэг',
    liveCost: 'Одоогийн төлбөр',
    liveElapsed: 'Өнгөрсөн хугацаа',
    sessionId: '#{id} дугаар цэнэглэлт',
    connectorBusy: 'Энд бүх холбогч одоогоор ашиглагдаж байна.',
    stationOffline: 'Энэ станц холбогдоогүй тул цэнэглэлт эхлүүлэх боломжгүй.',
    localOnlyTitle: 'Станц дээр нь эхлүүлнэ',
    localOnlyBody:
      'Энэ сүлжээнд цэнэглэлтийг станц дээр нь эхлүүлдэг. Картаа уншуулаад кабелиа залгахад доорх алхмууд өөрөө үргэлжилнэ.',
    autoNote: '6-9 дүгээр алхам өөрөө явагдана; танаас өөр юу ч шаардахгүй.',
    plugConfirm: 'Кабель залгагдсан',
    refreshFailed: 'Шууд мэдээлэл түр тасарлаа — дахин холбогдож байна…',
    viewReceipt: 'Энэ цэнэглэлтийг харах',
    startAnother: 'Дахин цэнэглэх',
  },

  start: {
    title: 'Цэнэглэлт эхлүүлэх',
    body: 'Холбосон картуудынхаа аль нэгээр энэ цэнэглэх цэг дээр цэнэглэлт эхлүүлнэ үү.',
    connectorLabel: 'Холбогч',
    anyConnector: 'Сул байгаа аль ч холбогч',
    tagLabel: 'Цэнэглэх карт',
    submit: 'Цэнэглэлт эхлүүлэх',
    submitting: 'Илгээж байна…',
    acceptedTitle: 'Хүсэлт хүлээн авлаа',
    acceptedBody: 'Цэнэглэх цэг хүсэлтийг хүлээн авлаа. Хараахан залгаагүй бол залгана уу.',
    notStartedTitle: 'Эхлээгүй',
    couldNotStartTitle: 'Эхлүүлж чадсангүй',
    requestFailed: 'Хүсэлтийг илгээж чадсангүй',
    rejected: 'Цэнэглэх цэг хүсэлтийг хүлээн авсангүй',
    signInPrompt: 'Утаснаасаа цэнэглэлт эхлүүлэхийн тулд нэвтэрч, картаа холбоно уу.',
    noTags: 'Эхлээд бүртгэлдээ цэнэглэх карт холбоно уу.',
    disabled: 'Энэ сүлжээнд цэнэглэлтийг цэнэглэх цэг дээр нь эхлүүлдэг. Картаа тэнд уншуулна уу.',
    localOnly:
      'Энэ цэнэглэх цэг дээрх цэнэглэлтийг төхөөрөмж дээр нь эхлүүлдэг — картаа уншуулаад залгана уу.',
    signInBody:
      'Утаснаасаа цэнэглэлт эхлүүлэхийн тулд нэвтэрнэ үү. Мөн цэнэглэх цэг дээр нь эхлүүлж болно.',
    signInCta: 'Нэвтэрч эхлүүлэх',
    linkTagBody:
      'RFID карт дээрээ бичигдсэн дугаарыг бүртгэлдээ холбовол эндээс цэнэглэлт эхлүүлэх боломжтой.',
    linkTagCta: 'Цэнэглэх карт холбох',
    allBusy:
      'Энд байгаа бүх холбогч завгүй эсвэл ашиглалтад байхгүй байна. Станц мэдээлэл илгээх бүрд энэ хуудас шинэчлэгдэнэ.',
    connectorOption: '{id}-р холбогч',
    plugFirst: 'Эхлээд кабелиа залгана уу. Эцсийн шийдвэрийг станц гаргах бөгөөд татгалзаж болно.',
    acceptedBody2: 'Цэнэглэх цэг хүсэлтийг хүлээн авлаа. Кабель бэхлэгдмэгц цэнэглэлт эхэлнэ.',
    rejectedBody: 'Цэнэглэх цэг «{status}» гэж хариулав. Өөр холбогч сонгох эсвэл төхөөрөмж дээр нь эхлүүлнэ үү.',
  },


  auth: {
    checkFields: 'Тэмдэглэсэн талбаруудаа шалгана уу',
    networkError: 'Сервертэй холбогдож чадсангүй. Холболтоо шалгаад дахин оролдоно уу.',
    loadingForm: 'Маягтыг ачааллаж байна',
    emailLabel: 'И-мэйл хаяг',
    emailPlaceholder: 'you@example.com',
    passwordLabel: 'Нууц үг',
    nameLabel: 'Бүтэн нэр',
    phoneLabel: 'Утасны дугаар',
    phonePlaceholder: '9911 2233',
    phoneHint:
      'Заавал биш. Нууц үг сэргээх SMS код илгээхэд ашиглана — дотоодын дугаараа бичихэд улсын код автоматаар нэмэгдэнэ.',
    passwordHint: 'Дор хаяж 8 тэмдэгт, үсэг болон тоо агуулсан байх ёстой.',
    confirmPasswordLabel: 'Нууц үгээ давтах',
    devHelper: 'Хөгжүүлэлтийн туслах',
    devHintBody:
      'И-мэйл, SMS илгээх тохиргоо хараахан хийгдээгүй тул нууц кодыг илгээхийн оронд энд харуулж байна. EMAIL_PROVIDER болон SMS_PROVIDER тохируулсны дараа энэ хэсэг алга болно; продакшнд хэзээ ч харагдахгүй.',
    yourCodeIs: 'Таны код',

    login: {
      metaTitle: 'Нэвтрэх',
      metaDescription:
        'Цэнэглэлт эхлүүлэх, түүхээ харахын тулд цэнэглэлтийн бүртгэлдээ нэвтэрнэ үү.',
      title: 'Нэвтрэх',
      subtitle: 'Цэнэглэлтийн бүртгэл, цэнэглэлт, баримтаа хараарай.',
      footerPrompt: 'Нэвтрэхэд асуудал гарав уу?',
      getHelp: 'Тусламж авах',
      failed: 'Нэвтэрч чадсангүй.',
      accountReady: 'Таны бүртгэл бэлэн боллоо',
      passwordChanged: 'Нууц үг солигдлоо',
      forgotPassword: 'Нууц үгээ мартсан уу?',
      noAccount: 'Бүртгэл байхгүй юу?',
      keepSignedIn: 'Намайг нэвтэрсэн хэвээр байлга',
      submit: 'Нэвтрэх',
      newHere: 'Шинэ хэрэглэгч үү?',
      createAccount: 'Бүртгэл үүсгэх',
    },

    register: {
      metaTitle: 'Бүртгүүлэх',
      metaDescription:
        'Цэнэглэлт эхлүүлж, баримтаа нэг дор хадгалахын тулд цэнэглэлтийн бүртгэл үүсгэнэ үү.',
      title: 'Бүртгэл үүсгэх',
      subtitle: 'Ганц минут зарцуулаад шууд цэнэглэж эхлэх боломжтой.',
      footerPrompt: 'Асуух зүйл байна уу?',
      readHelp: 'Тусламжийн хуудсыг үзэх',
      failed: 'Бүртгэл үүсгэж чадсангүй.',
      haveAccount: 'Бүртгэлтэй юу?',
      submit: 'Бүртгүүлэх',
      signInInstead: 'Оронд нь нэвтрэх',
      agreePrefix: 'Би',
      agreeMiddle: 'болон',
      agreeSuffix: '-ыг зөвшөөрч байна.',
    },

    forgot: {
      metaTitle: 'Нууц үг мартсан',
      metaDescription: 'И-мэйлээр сэргээх холбоос эсвэл SMS-ээр 6 оронтой код авна уу.',
      title: 'Нууц үгээ сэргээх',
      subtitle: 'Тантай хэрхэн холбогдохоо хэлж өгвөл дараагийн алхмыг илгээнэ.',
      footerPrompt: 'Асуудал үргэлжилж байна уу?',
      failed: 'Сэргээх зааврыг илгээж чадсангүй.',
      identifierLabel: 'И-мэйл эсвэл утасны дугаар',
      identifierHint: 'Бүртгэл үүсгэхдээ ашигласан хаяг эсвэл дугаараа оруулна уу.',
      identifierPlaceholder: 'you@example.com эсвэл 9911 2233',
      channelLabel: 'Хэрхэн илгээх вэ?',
      channelHint: 'И-мэйлээр сэргээх холбоос, SMS-ээр 6 оронтой код очно.',
      channelAuto: 'Бүртгэлд минь тохирохоор',
      channelEmail: 'И-мэйлээр холбоос илгээх',
      channelSms: 'SMS-ээр код илгээх',
      sent: 'Ийм бүртгэл байгаа бол сэргээх заавар удахгүй очно.',
      checkPhone: 'Утсаа шалгана уу',
      checkEmail: 'И-мэйлээ шалгана уу',
      checkMessages: 'Мессежээ шалгана уу',
      submit: 'Сэргээх заавар илгээх',
      tryDifferent: 'Өөр хаягаар оролдох',
      rememberedIt: 'Санаж орхив уу?',
    },

    reset: {
      metaTitle: 'Шинэ нууц үг сонгох',
      metaDescription:
        'Сэргээх холбоос эсвэл SMS-ээр ирсэн кодоор шинэ нууц үг тохируулна уу.',
      title: 'Шинэ нууц үг сонгох',
      subtitle: 'Энд өмнө нь ашиглаж байгаагүй нууц үг сонгоно уу.',
      footerPrompt: 'Бодлоо өөрчилсөн үү?',
      backToSignIn: 'Нэвтрэх хуудас руу буцах',
      failed: 'Нууц үгийг тань солиж чадсангүй.',
      needPhone: 'Ашигласан утасны дугаараа оруулна уу',
      needPhoneToResend: 'Кодыг хаашаа илгээхийг мэдэхийн тулд утасны дугаараа оруулна уу',
      codeLabel: '6 оронтой код',
      codeHint: 'Илгээснээс хойш 10 минутын дараа хүчингүй болно.',
      newPasswordLabel: 'Шинэ нууц үг',
      confirmNewLabel: 'Шинэ нууц үгээ давтах',
      resent: 'Тухайн дугаар бүртгэлтэй бол шинэ код удахгүй очно.',
      resendFailed: 'Одоохондоо шинэ код илгээж чадсангүй.',
      retryShortly: 'Сервертэй холбогдож чадсангүй. Хэсэг хугацааны дараа дахин оролдоно уу.',
      passwordChanged: 'Нууц үг солигдлоо',
      submit: 'Нууц үгээ солих',
      resend: 'Шинэ код илгээх',
    },

    verify: {
      metaTitle: 'И-мэйлээ баталгаажуулах',
      metaDescription: 'Цэнэглэлтийн бүртгэл дээрх и-мэйл хаягаа баталгаажуулна уу.',
      title: 'И-мэйлээ баталгаажуулах',
      subtitle: 'Хормын зуур үргэлжилнэ — өөр юу ч хийх шаардлагагүй.',
      confirming: 'И-мэйл хаягийг баталгаажуулж байна…',
      missingToken:
        'Энэ холбоост баталгаажуулах кодгүй байна. И-мэйл дэх холбоосыг дахин нээнэ үү.',
      invalidToken: 'Энэ баталгаажуулах холбоос хүчингүй болсон байна. Хугацаа нь дууссан байж магадгүй.',
      confirmed: 'И-мэйл баталгаажлаа',
      failedTitle: 'Энэ холбоосыг баталгаажуулж чадсангүй',
      signInFirst: 'Шинэ холбоосыг зөвхөн нэвтэрсэн бүртгэл рүү илгээх боломжтой. Эхлээд нэвтэрч орно уу.',
      resendFailed: 'Одоохондоо шинэ холбоос илгээж чадсангүй. Хэсэг хугацааны дараа дахин оролдоно уу.',
      resent: 'Шинэ баталгаажуулах холбоос удахгүй очно.',
      retryShortly: 'Сервертэй холбогдож чадсангүй. Хэсэг хугацааны дараа дахин оролдоно уу.',
      resend: 'Шинэ холбоос илгээх',
      confirmedBody:
        'Баярлалаа — хаяг тань баталгаажсан тул цэнэглэлтийн баримт, бүртгэлийн мэдэгдэл танд хүрнэ.',
      goToAccount: 'Бүртгэл рүүгээ очих',
      needSomethingElse: 'Өөр зүйл хэрэгтэй юу?',
    },
  },

  pricing: {
    metaTitle: 'Үнэ тариф',
    metaDescription:
      'Цэнэглэлтийн төлбөрийг киловатт-цагаар тооцно. Цэнэглэх цэг бүр операторынхоо тогтоосон өөрийн тарифтай бөгөөд залгахаас өмнө харагдана.',
    title: 'Үнэ тариф',
    intro:
      'Та авсан эрчим хүчнийхээ төлбөрийг киловатт-цагаар төлнө. Сүлжээний нэгдсэн үнэ гэж байхгүй: цэнэглэх цэг бүр ажиллуулж буй операторынхоо тогтоосон өөрийн тарифтай. Танд хамаарах тариф станцын хуудсанд эхлэхээс өмнө үргэлж харагдана.',
    howTitle: 'Төлбөрийг хэрхэн тооцох вэ',
    energyTitle: 'Хугацаа биш, эрчим хүч',
    energyBody:
      'Цэнэглэх цэг таны машины бодитоор авсан эрчим хүчийг хэмждэг. Нэг цэнэглэлтийн төлбөр нь тэр хэмжээг цэнэглэх цэгийн тарифаар үржүүлсэн дүн юм.',
    perPointTitle: 'Тариф нь цэнэглэх цэг тус бүрээр тогтоогддог',
    perPointBody:
      'Операторууд тарифаа тус тусад нь тогтоодог тул замын хажуугийн хурдан цэнэглэгч, зогсоол дахь удаан цэнэглэгч хоёр ижил үнэтэй байхгүй. Тариф тохируулаагүй цэнэглэх цэг үнийн оронд зураас харуулна.',
    shownTitle: 'Залгахаас өмнө харагдана',
    shownBodyPrefix: 'Станцыг',
    shownBodySuffix: 'хэсгээс нээж одоогийн тариф, холбогчийн төрөл, сул байдлыг харна уу.',
    recordedTitle: 'Хэтэвчнээс төлөгдөнө',
    recordedBody:
      'Хэтэвчээ QPay-ээр цэнэглэсэн бол дууссан цэнэглэлт бүрийн төлбөр тэр үлдэгдлээс автоматаар суутгагдана. Цэнэглэлт бүр хэтэвчийн түүхэнд бүртгэгдэнэ.',
    notesTitle: 'Анхаарах зүйл',
    note1:
      'Захиалга, гишүүнчлэл гэж байхгүй. Та зөвхөн бодитоор авсан эрчим хүчнийхээ төлбөрийг төлнө.',
    note2:
      'Мөнгийг зөвхөн QPay таны банкны апп дотор татдаг. Энэ сайт таны картын мэдээллийг хэзээ ч харахгүй.',
    note3:
      'Талбайн эзэн зогсоолын хураамж авдаг бол энэ нь цэнэглэлтийн тарифаас тусдаа бөгөөд энд харуулаагүй болно.',
    currentTitle: 'Одоогийн тарифууд',
    pricedCount: 'Нийт {total} цэнэглэх цэгээс {priced} нь киловатт-цагийн үнээ нийтэлсэн байна.',
    noneCount: 'Оператор бүр цэнэглэх цэгээ тохируулах явцдаа үнээ нийтэлдэг.',
    demoBody:
      'Цэнэглэх сүлжээтэй холбогдох боломжгүй тул доорх үнэ нь суурилуулсан жишээ сүлжээнээс авсан болно. Эдгээр нь бодит тариф биш.',
    failedTitle: 'Тариф боломжгүй байна',
    failedBody:
      'Одоогийн үнийг унших гэж цэнэглэх сүлжээтэй холбогдож чадсангүй. Хэдэн минутын дараа дахин оролдоно уу.',
    emptyBody: 'Одоогоор нийтлэгдсэн цэнэглэх цэг байхгүй тул үнэ тооцох зүйл алга.',
    caption: 'Цэнэглэх цэгүүд, киловатт-цагийн үнэ болон дээд хүчин чадлын хамт',
    colChargePoint: 'Цэнэглэх цэг',
    colPlugs: 'Холбогч',
    colMaxPower: 'Дээд хүчин чадал',
    colPrice: 'кВт·ц-ийн үнэ',
    footnote:
      'Энэ хуудас ачаалагдах бүрд үнийг цэнэглэх сүлжээнээс уншина. Оператор тарифаа хэдийд ч өөрчилж болох бөгөөд эхлэхийн өмнөхөн станцын хуудсанд харагдсан дүн хүчинтэй байна.',
  },

  help: {
    metaTitle: 'Тусламж',
    metaDescription:
      'Цэнэглэх цэг олох, холбогчийн төрөл, цэнэглэх карт, хэтэвч, нууц үг болон холбогдоогүй станцын талаарх түгээмэл асуултын хариулт.',
    title: 'Тусламж',
    intro:
      '{brand}-ийн талаар жолооч нарын хамгийн их асуудаг асуултууд. Хариултаа эндээс олохгүй бол хуудасны төгсгөлд холбоо барих мэдээлэл байгаа.',
    faqTitle: 'Түгээмэл асуултууд',

    q1: 'Цэнэглэх цэгийг хэрхэн олох вэ?',
    a1: '«Цэнэглэх цэг хайх» хэсгийг нээнэ үү. Сүлжээний бүх цэнэглэх цэг холбогчийн шууд төлөвтэйгээ харагдана. Нэр, хаягаар хайх эсвэл холбогчийн төрөл, хамгийн бага хүчин чадал, одоо сул эсэхээр шүүнэ үү. Хөтөчид байршил хуваалцахыг зөвшөөрвөл жагсаалт зайгаар эрэмбэлэгдэнэ. Станцыг нээвэл хаяг, тариф, холбогч бүр болон замын зааврын холбоос харагдана.',
    q2: 'Станцын төлөв юуг илэрхийлэх вэ?',
    a2: '«Одоо сул байна» гэдэг нь дор хаяж нэг холбогч сул, ажиллагаатай байгааг хэлнэ. «Бүх холбогч завгүй» гэдэг нь цэнэглэх цэг холбогдсон боловч бүх холбогч завгүй, захиалагдсан эсвэл эвдэрсэн байгааг хэлнэ. «Холбогдоогүй» гэдэг нь цэнэглэх цэг сүлжээтэй холбоо тасарсныг хэлнэ. Холбогч бүр мөн Бэлтгэж байна, Цэнэглэж байна, Эвдэрсэн зэрэг өөрийн төлвөө мэдээлдэг.',
    q3: 'Цэнэглэх карт гэж юу вэ, яагаад холбох ёстой вэ?',
    a3: 'Цэнэглэх карт гэдэг нь цэнэглэлтийг зөвшөөрүүлэхийн тулд уншигч дээр уншуулдаг RFID карт эсвэл түлхүүрийн оосор юм. Түүний дугаарыг «Миний бүртгэл» хэсэгт нэмбэл цэнэглэлтийн түүх тань энд харагдана — өгсөн эрчим хүч, үргэлжилсэн хугацаа, цэнэглэлт тус бүрийн төлбөр. Холбосон карт мөн таны хэтэвчний үлдэгдлээс төлбөрөө төлнө. Нэгээс олон карт холбож, хүссэн үедээ салгаж болно.',
    q4: 'Хэтэвч хэрхэн ажилладаг вэ?',
    a4: 'Хэтэвчээ QPay-ээр цэнэглэнэ үү — бэлэн дүнгүүдээс сонгох эсвэл өөрийн дүнгээ оруулаад QR кодыг банкны аппаараа уншуулна. QPay төлбөрийг баталгаажуулмагц үлдэгдэл шинэчлэгдэнэ. Цэнэглэлт дуусахад төлбөр нь тэр үлдэгдлээс автоматаар суутгагдаж, хэтэвчийн түүхэнд бүртгэгдэнэ. Энэ сайт таны картын мэдээллийг хэзээ ч харахгүй; төлбөр бүхэлдээ таны банкны апп дотор явагдана.',
    q5: 'Нууц үгээ хэрхэн сэргээх вэ?',
    a5: '«Нууц үг мартсан» хэсэгт орж бүртгэлийнхээ и-мэйл хаяг эсвэл утасны дугаарыг оруулна уу. И-мэйлээр илгээсэн холбоос 30 минут, SMS-ээр илгээсэн 6 оронтой код 10 минут хүчинтэй. Аюулгүй байдлын үүднээс бүртгэл байгаа эсэхээс үл хамааран хуудас ижил хариу харуулах тул дэлгэц дээрх бичвэрийг бус, и-мэйл эсвэл мессежээ шалгана уу. Нууц үгээ солиход бусад бүх төхөөрөмжөөс гарна.',
    q6: 'Станц яагаад «холбогдоогүй» гэж харагдаж байна вэ?',
    a6: 'Цэнэглэх цэгүүд сүлжээтэй тогтмол холбогддог. Гар утасны сүлжээ тасрах, цахилгаан таслагдах, засвар үйлчилгээ хийгдэх зэргээр энэ холбоо тасарвал сүлжээ холбогчид юу болж байгааг мэдэхээ болих тул станцыг «холбогдоогүй» гэж тэмдэглэнэ. Холбогдоогүй цэнэглэх цэг ихэвчлэн RFID картаар дотооддоо ажилладаг тул та тэнд байгаа бол туршиж үзэх нь зүйтэй. Цэнэглэх цэг дахин холбогдмогц цэнэглэлт сүлжээнд бүртгэгдэнэ.',
    q7: 'Энэ аппаас цэнэглэлт эхлүүлж болох уу?',
    a7: 'Зөвхөн оператор алсаас эхлүүлэх боломжийг идэвхжүүлсэн бөгөөд сүлжээ таних холбосон карттай тохиолдолд боломжтой. Боломжтой үед нэвтэрсний дараа станцын хуудсанд эхлүүлэх товч харагдана; үгүй бол ердийнхөөрөө цэнэглэх цэг дээр картаа уншуулна уу.',
    q8: 'Миний цэнэглэлт түүхэнд харагдахгүй байна',
    a8: 'Цэнэглэлтийг цэнэглэх картаар тань тааруулдаг тул ашигласан карт тань «Миний бүртгэл» хэсэгт холбогдсон эсэхийг шалгана уу — дугаар нь том жижиг үсгийн хамт яг таарах ёстой. Цэнэглэх цэг холбогдоогүй байхад эхэлсэн цэнэглэлт нь тухайн цэг дахин холбогдож мэдээллээ илгээсний дараа л харагдана.',

    plugsTitle: 'Холбогчийн төрлүүд',
    plugsIntro:
      'Таны машин эдгээрийн нэг эсвэл хоёрыг нь дэмждэг. Станц руу явахаасаа өмнө станцын хуудсанд холбогчийн төрлийг шалгана уу — буруу залгууртай хурдан цэнэглэгч ямар ч хэрэггүй.',
    plug1: 'Type 2 (Mennekes)',
    plug1Body:
      'Европ дахь стандарт AC холбогч бөгөөд нийтийн AC баганы үндсэн залгуур. Ихэвчлэн 7-22 кВт — удаан зогсоход тохиромжтой, түргэн цэнэглэхэд биш.',
    plug2: 'CCS2 (Combo 2)',
    plug2Body:
      'Доор нь хоёр нэмэлт DC зүүтэй Type 2 холбогч. Хамгийн түгээмэл DC хурдан цэнэглэх стандарт, ихэвчлэн 50 кВт ба түүнээс дээш, кабель нь цэнэглэх цэгт бэхлэгдсэн байдаг.',
    plug3: 'CHAdeMO',
    plug3Body:
      'Японы хуучин DC хурдан цэнэглэх стандарт, Nissan Leaf болон импортын хэд хэдэн загварт хэвээр ашиглагдаж байна. Ихэвчлэн 50-100 кВт хүртэл.',
    plug4: 'GB/T',
    plug4Body:
      'Хятадын DC хурдан цэнэглэх стандарт, Хятадаас импортолсон олон тээврийн хэрэгсэлд суурилуулсан байдаг. CCS2, CHAdeMO-той биетээр нийцэхгүй.',
    plug5: 'Type 1 (J1772)',
    plug5Body:
      'Японы болон Хойд Америкийн хуучин машинуудад байдаг нэг фазын AC холбогч. Зөвхөн AC тул цэнэглэлт удаан.',
    plug6: 'Schuko',
    plug6Body:
      'Энгийн гэрийн залгуур. Ойролцоогоор 2-3 кВт-ын сүүлчийн арга; шөнөжингөө цэнэглэхэд тохиромжтой, замын дундах зогсолтод биш.',

    contactTitle: 'Холбоо барих',
    contactBody:
      'Цэнэглэх цэгийн эвдрэл — салдаггүй холбогч, гэмтсэн кабель, унтарсан дэлгэц — гарвал энэ сайтад харагдах цэнэглэх цэгийн нэр болон төхөөрөмж дээр хэвлэгдсэн дугаарыг хэлнэ үү.',
    contactPlaceholderTitle: 'Түр мэдээлэл',
    contactPlaceholderBody:
      'Энэ системд тусламжийн холбоо барих мэдээллийг хараахан тохируулаагүй байна. Оператор эндээс нийтлэх хүртэл цэнэглэх цэг дээр хэвлэгдсэн утас эсвэл и-мэйлийг ашиглана уу.',

    safetyTitle: 'Цэнэглэх цэг дээрх аюулгүй байдал',
    safety1: 'Хагарсан, шатсан эсвэл дотроо норсон кабель, холбогч бүү ашиглаарай.',
    safety2: 'Салгахаасаа өмнө цэнэглэлтийг зогсооно уу; ачаалалтай байхад кабелийг бүү тат.',
    safety3: 'Хүн бүдрэхгүйн тулд кабелийг явган хүний замаас зайлуулаарай.',
    safety4: 'Ослын үед төхөөрөмж дээрх зогсоох товчийг дараад операторт залгана уу.',

    moreTitle: 'Бусад',
    howPricingWorks: 'Үнэ хэрхэн тооцогддог вэ',
  },

  terms: {
    metaTitle: 'Үйлчилгээний нөхцөл (төсөл)',
    metaDescription:
      'Цэнэглэлтийн аппын үйлчилгээний нөхцөлийн төсөл. Нээхээс өмнө операторын өөрийн эрх зүйн бичвэрээр солигдоно.',
    draftTitle: 'Төсөл — хараахан хууль зүйн хүчин төгөлдөр бус',
    draftBody:
      'Энэ бол аппад бүрэн хуудсууд байлгах зорилгоор бичсэн түр бичвэр юм. Үйлчилгээг олон нийтэд нээхээс өмнө операторын өөрийн, хуульчаар хянуулсан үйлчилгээний нөхцөлөөр солих ёстой.',
    title: 'Үйлчилгээний нөхцөл',
    intro: '{brand} вэбсайт болон түүнд тодорхойлсон цэнэглэх сүлжээг ашиглах журам.',
    seeAlsoPrefix: 'Мөн энэ апп таны талаар юу хадгалдгийг тайлбарласан',
    privacyLink: 'нууцлалын бодлого',
    seeAlsoSuffix: '-ыг үзнэ үү.',

    s1: 'Энэ үйлчилгээний тухай',
    s1a:
      '{brand} нь цэнэглэх сүлжээний цэнэглэх цэгүүд, тэдгээрийн сул байдал, тарифыг харуулж, жолоочид цэнэглэлтээ нэг дор жагсаах бүртгэл хөтлөх боломж олгодог вэбсайт юм. Цэнэглэх цэгүүд өөрсдөө сүлжээний операторын мэдэлд байдаг.',
    s1b:
      'Энэ сайтыг ашиглах нь өөрөө цэнэглэлтийн гэрээ үүсгэхгүй. Цэнэглэлтийн төлбөрийг хэнд, хэр хэмжээгээр төлөх нь операторт эсэхтэй байгуулсан тохиролцоогоор зохицуулагдана.',

    s2: 'Таны бүртгэл',
    s2a:
      'Та ажиллагаатай и-мэйл хаяг өгч, үсэг болон тоо агуулсан дор хаяж найман тэмдэгтийн нууц үг сонгох ёстой. Нууц үгээ бусдад бүү хэл; түүнийг мэдсэн хүн таны цэнэглэлтийн түүхийг харж, хэтэвчний үлдэгдлийг зарцуулж чадна. Хэн нэгэн нэвтэрсэн гэж бодож байвал операторт нэн даруй мэдэгдэнэ үү.',
    s2b:
      'Нэг бүртгэл нэг хүнд зориулагдана. Та зөвхөн өөрийн цэнэглэх картуудын дугаарыг холбож болно. Өөрийнх биш картыг бүү холбоорой: ингэснээр өөр жолоочийн цэнэглэлт танд харагдах бөгөөд буруу ашигласанд тооцогдож болно.',

    s3: 'Цэнэглэх цэг ашиглах',
    s3a:
      'Төхөөрөмж дээр харагдах заавар болон тухайн байршлын дүрмийг дагана уу. Гэмтэлтэй харагдаж буй тоног төхөөрөмжийг бүү ашиглаарай. Цэнэглэх цэгийг задлах, өөрчлөх, саад учруулах гэж бүү оролдоорой, мөн цэнэглээгүй үедээ цэнэглэх байрыг бүү хаагаарай.',
    s3b:
      'Та өөрийн тээврийн хэрэгсэл болон түүний цэнэглэх төхөөрөмжийн төлөө, мөн тухайн холбогч, хүчин чадал түүнд тохирох эсэхийг тодорхойлох үүрэгтэй.',

    s4: 'Хүртээмж ба үнэн зөв байдал',
    s4a:
      'Сул байдал, холбогчийн төлөв, тарифыг цэнэглэх сүлжээнээс хамгийн сүүлд мэдээлсэн байдлаар харуулна. Сүлжээтэй холбоо тасарсан цэнэглэх цэгийг «холбогдоогүй» гэж тэмдэглэх бөгөөд холбогчийн төлөв нь тодорхойгүй байна. Мэдээлэл хуучирсан эсвэл дутуу байж болох ба та очиход цэнэглэх цэг завгүй эсвэл ажиллагаагүй байж магадгүй.',
    s4b:
      'Үйлчилгээг байгаа байдлаар нь үзүүлнэ. Засвар үйлчилгээний улмаас тасалдаж, боломжууд өөрчлөгдөх буюу зогсох магадлалтай.',

    s5: 'Үнэ, хэтэвч ба төлбөр',
    s5a:
      'Цэнэглэх цэг бүр операторынхоо тогтоосон киловатт-цагийн үнэтэй байдаг бөгөөд үүнийг үнэ тарифын хуудсанд тайлбарласан болно.',
    s5b:
      'Хэтэвч гэдэг нь таны нэр дээр байрлах урьдчилсан төлбөрийн үлдэгдэл юм. Үүнийг QPay-ээр, таны банкны апп дотор цэнэглэдэг; энэ сайт таны картын мэдээллийг хэзээ ч хүлээн авахгүй, хадгалахгүй. Дууссан цэнэглэлтийн төлбөрийг тэр үлдэгдлээс суутгах бөгөөд хөдөлгөөн бүрийг хэтэвчийн түүхэнд бүртгэнэ.',
    s5c:
      'Цэнэглэлтийн төлбөр боломжит үлдэгдлээс давбал дутуу дүнг хэтэвчинд бүртгэж, дараагийн цэнэглэлтээр төлүүлнэ. Хэтэвчний үлдэгдлийг бусдад шилжүүлэх боломжгүй бөгөөд хүү тооцохгүй. Буцаалтыг оператор шийдвэрлэнэ.',

    s6: 'Зөвшөөрөгдөх хэрэглээ',
    s6a:
      'Өөрийнх бус бүртгэл, системд нэвтрэх гэж оролдох, үйлчилгээг хуулбарлах эсвэл хэт ачаалах, хууль зөрчихөд ашиглахыг хориглоно. Сайтын интерфэйс рүү автоматаар хандахыг хязгаарладаг бөгөөд хаагдаж болно.',

    s7: 'Хариуцлага',
    s7a:
      '[Түр бичвэр — операторт хамаарах хуулийн дагуу боловсруулсан хариуцлагын хязгаарлалт, баталгаа, нөхөн төлбөрийн заалт энд орно. Энэ төсөлд байгаа зүйлийг хариуцлагын хязгаарлалт гэж үзэж болохгүй.]',

    s8: 'Хандалтыг зогсоох',
    s8a:
      'Та үйлчилгээг ашиглахаа хэдийд ч зогсоож болно. Энэхүү нөхцөлийг зөрчсөн эсвэл хүн, тоног төхөөрөмжид аюул учруулахаар ашиглаж буй бүртгэлийг оператор түдгэлзүүлж болно. Бүртгэлээ хаахаасаа өмнө хэтэвчинд үлдсэн үлдэгдлийн талаар операторт хандана уу.',

    s9: 'Нөхцөлийн өөрчлөлт',
    s9a:
      'Энэхүү нөхцөл өөрчлөгдөж болно. Энэ хуудсанд нийтлэгдсэн хувилбар хүчинтэй байна. Өөрчлөлт танд ноцтой нөлөөлөх тохиолдолд оператор хүчин төгөлдөр болохоос өмнө танд мэдэгдэх ёстой.',

    s10: 'Хамаарах хууль ба холбоо барих',
    s10a:
      '[Түр бичвэр — оператор хамаарах хууль, эрх бүхий шүүх, үйлчилгээг эрхлэгч хуулийн этгээд, түүний бүртгэлтэй хаяг болон эрх зүйн мэдэгдэл хүлээн авах хаягаа заах ёстой.]',
  },

  privacy: {
    metaTitle: 'Нууцлалын бодлого (төсөл)',
    metaDescription:
      'Энэ цэнэглэлтийн апп жолоочийн талаар яг юу хадгалдгийг жагсаасан нууцлалын бодлогын төсөл. Нээхээс өмнө операторын өөрийн бичвэрээр солигдоно.',
    draftTitle: 'Төсөл — хараахан албан ёсны мэдэгдэл бус',
    draftBody:
      'Энэ бол аппад бүрэн хуудсууд байлгах зорилгоор бичсэн түр бичвэр юм. Программ юу хадгалдгийг үнэн зөв тайлбарласан боловч үйлчилгээг олон нийтэд нээхээс өмнө операторын өөрийн, хуульчаар хянуулсан нууцлалын бодлогоор солих ёстой.',
    title: 'Нууцлалын бодлого',
    intro: '{brand} таны талаар юу, яагаад хадгалдаг, та юу хийж болох тухай.',
    storedTitle: 'Юу хадгалагддаг вэ',
    seeAlsoPrefix: 'Мөн',
    termsLink: 'үйлчилгээний нөхцөл',

    itemName: 'Нэр',
    itemNameBody: 'Бүртгэл үүсгэхдээ бичсэн нэр. Интерфэйс дээр танд хандахад ашиглана.',
    itemEmail: 'И-мэйл хаяг',
    itemEmailBody:
      'Таны нэвтрэх нэр бөгөөд нууц үг сэргээх, баталгаажуулах холбоос илгээх хаяг. Жижиг үсгээр хадгалагдана.',
    itemPhone: 'Утасны дугаар (заавал биш)',
    itemPhoneBody:
      'Зөвхөн та өгсөн тохиолдолд. Найдвартай тааруулах боломжтой байхаар олон улсын форматаар хадгалж, дугаараа баталгаажуулах эсвэл SMS-ээр нууц үгээ сэргээхэд 6 оронтой код илгээхэд ашиглана.',
    itemPassword: 'Нууц үгийн хэш',
    itemPasswordBody:
      'Таны нууц үгийг хэзээ ч хадгалдаггүй. Зөвхөн bcrypt хэшийг хадгалдаг бөгөөд түүнээс нууц үгийг сэргээх боломжгүй.',
    itemTags: 'Холбосон цэнэглэх картын дугаарууд',
    itemTagsBody:
      'Таны бүртгэлд холбосон RFID карт эсвэл оосорны дугаарууд. Эдгээр нь танд хамаарах цэнэглэлтийг олох, мөн цэнэглэлтийг таны хэтэвчтэй холбох үндэс болно.',
    itemState: 'Бүртгэлийн төлөв',
    itemStateBody:
      'И-мэйл, утас баталгаажсан эсэх, сонгосон хэл, бүртгэл идэвхтэй эсэх, хэзээ үүсгэсэн, хамгийн сүүлд хэзээ нэвтэрсэн зэрэг.',
    itemTokens: 'Баталгаажуулах ба сэргээх кодууд',
    itemTokensBody:
      'Сэргээх холбоос эсвэл нэг удаагийн код хүчинтэй байх хугацаанд бид түүний хэш, илгээсэн хаяг, дуусах хугацаа, хэдэн удаа оролдсоныг хадгална. Код өөрөө хадгалагдахгүй.',
    itemWallet: 'Хэтэвчний үлдэгдэл ба хөдөлгөөн',
    itemWalletBody:
      'Таны урьдчилсан төлбөрийн үлдэгдэл болон түүн дээрх хөдөлгөөн бүр — цэнэглэлт, төлбөр, буцаалт, тохируулга — дүн, хугацаа, юунд хамаарахын хамт. Үүнийг цэнэглэх сүлжээ хадгалдаг бөгөөд энэ аппын мэдээллийн санд байхгүй. Энэ системд карт, банкны мэдээллийг хаана ч хадгалдаггүй: цэнэглэлтийг бүхэлд нь таны банкны апп дотор зөвшөөрөх бөгөөд QPay бидэнд зөвхөн нэхэмжлэх төлөгдсөнийг мэдэгддэг.',
    itemSessions: 'Цэнэглэлтийн бүртгэл',
    itemSessionsBody:
      'Эхэлсэн, дууссан хугацаа, цэнэглэх цэг, холбогч, цэнэглэх карт, өгсөн эрчим хүч, төлбөр. Эдгээрийг энэ апп биш, цэнэглэх сүлжээ хадгалдаг: та түүхээ нээхэд холбосон картуудад тань хамаарахыг нь татаж авах бөгөөд энэ аппын мэдээллийн санд хуулж авдаггүй.',

    s1: 'Энэ мэдээллийг яагаад хадгалдаг вэ',
    s1a: 'Таныг нэвтрүүлэх, бүртгэлийг тань аюулгүй байлгах.',
    s1b: 'Бүртгүүлэх, сэргээх үйл явцад шаардлагатай и-мэйл, мессежийг илгээх.',
    s1c: 'Таны холбосон цэнэглэх картуудад бүртгэгдсэн цэнэглэлтийг харуулах.',
    s1d: 'Таны урьдчилсан төлбөрийн үлдэгдлийг хадгалж, дууссан цэнэглэлтийн төлбөрийг түүнээс тооцох.',
    s1e: 'Бүртгэлийг бөөнөөр халдлагад өртөхөөс сэргийлж нэвтрэх, сэргээх, цэнэглэх оролдлогыг хязгаарлах.',

    s2: 'Хаана хадгалагддаг вэ',
    s2a:
      'Жолоочийн бүртгэл нь операторын MongoDB мэдээллийн санд, операторын өөрийн ажилтнуудын бүртгэлээс тусдаа коллекцод байрлана. Хөгжүүлэлтийн үед апп хөгжүүлэгчийн компьютер дээрх JSON файлыг ашиглаж болох ба энэ нь продакшнд идэвхгүй байна.',
    s2b:
      'Цэнэглэлтийн бүртгэл болон хэтэвчний үлдэгдэл нь цэнэглэх сүлжээний өөрийн мэдээллийн санд байрлана. Энэ апп тэдгээрийг сервер хоорондын холболтоор уншдаг; таны хөтөч цэнэглэх сүлжээтэй шууд харьцдаггүй.',

    s3: 'Күүки',
    s3a:
      'Хоёр күүки ашиглана. Сешн күүкийг зөвхөн нэвтэрсний дараа тохируулна: энэ нь гарын үсэгтэй токен агуулах бөгөөд хуудасны скрипт уншиж чадахгүйгээр HttpOnly гэж тэмдэглэгдсэн, зөвхөн ижил сайтын шилжилтэд хязгаарлагдсан, продакшнд зөвхөн HTTPS-ээр илгээгдэнэ. Хоёр дахь күүки таны хэлний сонголтыг хадгалах бөгөөд зөвхөн хэлний код агуулна.',
    s3b:
      'Энэ сайтад сурталчилгаа, аналитикийн күүки байхгүй. Газрын зургийн хэсгүүдийг гуравдагч талын сервертэй ачаалдаг бөгөөд тэр нь таны IP хаягийг харна.',

    s4: 'Хэнтэй хуваалцдаг вэ',
    s4a:
      'Таны цэнэглэлт, үлдэгдлийг хайхын тулд цэнэглэх картын дугаарыг тань цэнэглэх сүлжээ рүү илгээнэ. Таны хүссэн мессежийг хүргэх зорилгоор л и-мэйл хаягийг тань операторын тохируулсан мэйл сервер рүү, утасны дугаарыг тань SMS гарц руу дамжуулна.',
    s4b:
      'Та хэтэвчээ цэнэглэхэд төлбөрийг үүсгэхийн тулд дүн болон нэхэмжлэхийн дугаарыг QPay руу илгээнэ. QPay нэхэмжлэхийн лавлагаа болгож таны бүртгэл дэх утасны дугаар эсвэл и-мэйлийг мөн хүлээн авч болно.',
    s4c:
      'Ямар ч мэдээллийг зардаггүй, сурталчилгааны зорилгоор хуваалцдаггүй. [Түр бичвэр — оператор нээхээсээ өмнө ашиглаж буй мэйл, SMS үйлчилгээ үзүүлэгч болон хостинг үйлчилгээ үзүүлэгчийг нэрлэх ёстой.]',

    s5: 'Хэр удаан хадгалагддаг вэ',
    s5a:
      'Бүртгэлийн мэдээллийг бүртгэл байх хугацаанд хадгална. Сэргээх холбоос 30 минут, SMS код 10 минут, и-мэйл баталгаажуулах холбоос 24 цагийн дараа хүчингүй болно. Хэтэвчний хөдөлгөөний бүртгэл нь санхүүгийн бичиг баримт тул операторын нягтлан бодох бүртгэлийн үүрэг шаардсан хугацаанд хадгалагдана. [Түр бичвэр — оператор хаагдсан бүртгэл болон цэнэглэлтийн бүртгэлийн хадгалах хугацаагаа заах ёстой.]',

    s6: 'Таны сонголт',
    s6a:
      'Та нэр, утасны дугаар, хэлээ өөрчлөх, цэнэглэх карт нэмэх, хасахыг бүртгэлээсээ хийж болно. Карт хасахад түүний цэнэглэлт танд харагдахаа болих боловч сүлжээнд байгаа бүртгэл нь устахгүй.',
    s6b:
      'Бүртгэл хаах нь энэ аппад хараахан өөрөө хийх боломжгүй байна — операторт хандаж хаалгах, мөн хэтэвчинд үлдсэн үлдэгдлийн талаар асууна уу. [Түр бичвэр — оператор өөрийн харьяалагдах хууль зүйн орчинд үйлчлэх хандах, засах, устгах, гомдол гаргах эрх болон хэнд хандахыг тодорхойлох ёстой.]',
  },

};

const DICTIONARIES: Record<Locale, Dictionary> = { mn, en };

/**
 * Client-safe dictionary lookup. `@/lib/i18n` re-exports this alongside the
 * cookie-reading helpers, which are server-only.
 */
export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/**
 * Replaces {placeholder} tokens: format(d.footer.rights, { year: 2026 }).
 *
 * Lives here rather than in ./index because this module imports nothing from
 * `next/headers` — components shared between the server and client trees can
 * import it without dragging server-only code into the browser bundle.
 */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
