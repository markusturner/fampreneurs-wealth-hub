import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useIsAdminOrOwner } from '@/hooks/useIsAdminOrOwner'
import { useAgreementStatus } from '@/hooks/useAgreementStatus'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { Loader2, CheckCircle2, Shield, Upload, Mail, Clock, FileCheck, PenTool, Eye } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'

const TFV_AGREEMENT = `Program Services Agreement

Thank you for choosing The Fampreneurs to advise and implement how to start a family business by showing you how to leverage family credit, trusts, and legacy. We are excited to work with you to start and grow your family business.

This Agreement is entered into on this date ______________________________, by and between _________________________________ ("Mentee"), residing at ____________________________________________________________________________, and VNCI, LLC ("The Fampreneurs").

The Mentee and "The Fampreneurs's team agree as follows:

Note to Mentees: One of the most difficult aspects of successfully growing a business is making sure you keep your proprietary information and intellectual property protected, while simultaneously balancing your culture, authenticity, and commitment to Mentees. The Fampreneurs' Mastermind Program works to provide the best possible experience for all our Mentees and the following agreement outlines some parameters and terms of the Program so that each party clearly understands any and all boundaries to secure a strong business relationship and provide the best possible experience to one another.

To gain the most benefit from The Fampreneurs' Mentorship program you agree to the following:

Section 1. Program Guidelines and Payment Details

Program: The Family Vault Program.

Program Details:

The mastermind will include:

FREE Private Access to 'The Fampreneurs Community'

Access to our In-House Trust Software where we design your personalized Private Family Trust, Unincorporated Business Trust, and 508(c)(1)(a) Faith-Based Organizational Trust for your family business.

FOR CLIENTS UNDER 680 credit score - We provide access to our AI-powered credit disputing software for a 90-day period, empowering you to handle your own credit repair using Consumer Law and Metro 2 Compliance standards. Please note: This DIY tool is separate from our funding-related services and is not covered by our 3-month guarantee.

FOR CLIENTS OVER 680 credit score - We provide a done-for-you credit stacking assessment designed to strategically position you to obtain up to $25,000 in credit funding under the entity of your choosing. A standard administrative fee of ten percent (10%) shall be assessed on the total amount of credit funding secured on your behalf. For example, if $25,000 in credit funding is obtained, the administrative fee due shall be $2,500. If, for any reason, we use our in-house funding resources to help you fund the program investment directly, the same ten percent (10%) administrative fee will apply to the amount funded, along with repayment of the original program investment. Should it be determined that additional measures are required to properly establish or enhance your credit report in order to proceed with the funding process (including, but not limited to, tradeline additions, credit profile optimization, or similar preparatory services), such services shall incur an additional charge, which will be communicated to you in advance and must be paid prior to commencement of such work.

Payment Terms:

Total Program Cost: The Family Vault Program - Regularly $3,000, but today for ONLY $2,500.

Reduced sums may be offered as part of the promotions from time to time in which case the compensation will be altered to reflect the promotional price.

If you are enrolling under a payment plan, the total investment is Three Thousand Dollars ($3,000.00). An initial deposit of Five Hundred Dollars ($500.00) is required to secure your enrollment, followed by six (6) consecutive monthly payments of Five Hundred Dollars ($500.00) each.

Please note, if the "Mentee" is on a payment plan, certain deliverables will be dispersed as follows:

Payment 1 of the 6 month installment payment schedule, the "Mentee" will receive access to the family trust and the rest of the deliverables.

If payment 2-6 of the 6 month installment payment schedule is not received within 30 days, or within a 5 day grace period after the 30 days, without written communication expressing hardship, mentees will lose access to all of The Fampreneurs Mentorship Program deliverables and softwares.

Payment may be made via wire transfer. Wire transfer information will be provided by The Fampreneurs' Mentorship program at the time of sign-up.

All payments are non refundable. The sign-up start time is considered to be at the time of signing this document. All sales are non-refundable and chargebacks are not allowed. All non-payment will result in a filing with UCC as a lien.

The "Mentee" may determine which payment method is preferred, and the "Mentee" is responsible for informing "The Fampreneurs" of this preference at least five (5) business days before the payment due date since The Fampreneurs' Mentorship program's payment system may automatically charge one of the cards on file that may not be the "Mentee's" preferred payment method.

Section 2. Terms of Participation

Our goal at The Fampreneurs' Mentorship and within the program is to provide the best possible experience for all program participants and subscribers. Due to this fact, The Fampreneurs' Mentorship program holds the right to limit, suspend, and/or terminate your subscription and participation at any point in any of the programs offered by The Fampreneurs' Mentorship program due to you:

Becoming disruptive or overly difficult to work with, hindering the productivity and/or participation of any The Fampreneurs' Mentorship program employee, subscriber, customer, Mentee, or instructor. Failure to follow The Fampreneurs' Mentorship program guidelines as laid out in this agreement.

Section 3. Non-Solicitation

We at The Fampreneurs' Mentorship program take the protection of our proprietary information and intellectual property very seriously. For this reason and the benefit of The Fampreneurs' Mentorship program, you agree that during and following the completion of your membership in the program (6-month mark from the signup date) you will not directly or indirectly solicit any person, Mentee, or employee of The Fampreneurs' Mentorship program to compete with The Fampreneurs' Mentorship program or provide similar services like The Fampreneurs' Mentorship program for the term of 12 months (1 year). (18 months from the start date of the program)

You may not act individually or as a business/entity/consultant to compete or provide similar services like The Fampreneurs' Mentorship program for the terms explained above (18 months from the start date of The Fampreneurs' Mentorship program)

Section 4. Content Sharing

The Fampreneurs' Mentorship program will respect your and your fellow members' privacy. In return, The Fampreneurs' Mentorship program expects you to respect fellow Program members' privacy and The Fampreneurs' Mentorship program subscription members. Alongside this, you agree to not infringe upon The Fampreneurs' Mentorship program or fellow members' rights, trademarks, logos, designs, programs, and/or businesses without prior written consent.

Confidential information shared by The Fampreneurs' Mentorship Mastermind program or fellow program members is The Fampreneurs' Mentorship program's property and/or the member who discloses the information.

Recorded content is not to be shared at any time with anyone outside of the program. All materials, content, recordings, writings, and directions are always confidential and kept private. Failure to abide by this guideline is subject to immediate removal from the program with no refund of any kind.

Any reproduction or resale of the content within The Fampreneurs' Mentorship program is strictly prohibited.

Section 5. Terms of Service

You irrevocably agree that signing up and paying (the "Company" or "we/us") is accepting you as The Fampreneurs' Mentorship program (the "Program") participant. The Fampreneurs' Mentorship Program Participant Agreement (the "Agreement") automatically becomes a binding contract between you and the Company and applies to your participation in the program.

By signing this agreement, you acknowledge that you have read, agree to, and accept all of the terms and conditions in this Agreement. We may amend this Agreement at any time by sending you a revised version at the address you provide us.

By filling in your credit/debit card information and submitting it, you authorize the Company to charge your credit or debit cards indicated above as payment for your membership in the Program. To further clarify, after you sign this agreement, you agree that no refunds will be issued, and all monthly payments (if applicable) must be paid on a timely basis regardless of your participation or results.

We are committed to providing all Program participants with a positive Program experience. By signing this agreement, you agree that the Company may, at its sole discretion, terminate this agreement, and limit, suspend, or terminate your participation in the Program without a refund or forgiveness of the remaining monthly payments if you become disruptive or difficult to work with, if you fail to follow the Program guidelines, or if you impair the participation of Program instructors or participants in the Program. We respect your privacy and, as such, must insist that you respect the privacy of fellow Program participants.

By signing this agreement, you agree not to violate the publicity or privacy rights of any Program participant. We respect your confidential and proprietary information, ideas, plans, and trade secrets (collectively, "Confidential Information"). We must insist that you respect the same rights as fellow Program participants and the Company. By signature you "agree" above, you agree (1) not to infringe on any Program participants of the Company's copyright, patent, trademark, trade secret, or another intellectual property right, (2) that any confidential information shared by Program participants or any representative of the company is confidential and proprietary, and belongs solely and exclusively to the Participant who discloses it or the Company, (3) you agree not to disclose such information to any other person or use it in any manner other than in discussion with the other Program participants during Program sessions. By Signing, you further agree that (4) all materials and information provided to you by the Company may only be used by you as authorized by the Company, and (5) the reproduction, distribution, and sales of these materials by anyone is strictly prohibited. Further, by signing, you agree that, if you violate or display any likelihood of violating, any of your agreements contained in this paragraph, the Company and/or the other Program participant(s) will be entitled to injunctive relief to prohibit any such violations from protecting against the harm of such violations. We have made every effort to represent the Program and its potential accurately. The testimonials and examples used are not intended to represent or guarantee that anyone will achieve the same or similar results; each individual's success depends on many factors, including his or her background, dedication, desire, motivation, consistency, and action-taking. By signing, you acknowledge that there is an inherent risk of loss of capital as with any business endeavor. There is no guarantee that you will earn any money due to your participation in the Program.

The Fampreneurs FAQs:

Note: Please read the following FAQs thoroughly to better understand what to expect with The Fampreneurs' Mentorship program features and benefits.

General Overview: The following features are included within your The Fampreneurs' Mentorship Membership: (1) Coaching calls and The Fampreneurs' Mentorship community

Coaching calls – The schedule of calls below occurs on either a monthly or weekly basis. It is highly recommended upon joining The Fampreneurs' Mentorship to attend as many coaching calls as possible. Members are responsible for attending and addressing any questions they may have related to the call subject matter. Call duration is normally between 30 minutes to 2 hours each. Please note: These calls, dates and times are subject to change.

Additional The Fampreneurs FAQs

"When does my year in the mastermind start?"
It starts on the exact date that you joined The Fampreneurs' Mentorship and lasts for 90 days from that point onwards.

"What type of support do we receive with The Fampreneurs' Mentorship & does everyone start at the same time or same level?"

The Fampreneurs' Mentorship is a high-level coaching program that will be done at your pace. We have people just starting as well as advanced entrepreneurs. We will be able to serve at each level based on the program and the coaches.

Section 6. Program Content and Direction

Program content is based on investment experiences and is always evolving/changing. The program is meant for a general audience. It is not construed as investment advice or financial direction on any specific business or transaction about investing or otherwise. The content within The Fampreneurs' Mentorship program is focused on the principles of gaining capital to fund your investments.

The information contained within The Fampreneurs' Mentorship program is strictly for educational purposes. Program content is for individual member use only. You understand that without taking proper action on the course material that you will receive zero results.

Section 7. Right to Use Name and Likeness

You hereby consent to the use of your name, photograph, likeness, voice, testimonial, and biographical material, in whole or in part, for publication or reproduction in any medium, including but not limited to television, radio, print media, and the internet, among others, for any purposes including but not limited to public relations, education, advertising, marketing, training, and research.

Section 8. Terms of Sale

You hereby agree that all Program sales are final, non-refundable, and non-transferable.

You agree to make all payments on time and in full, as outlined in Section 1.

You agree to waive any/all rights to charge-back, dispute, or make claims ("disputes") against any payment made to The Legatum Group, LLC.

Section 9. The Fampreneurs' Mentorship program includes

Coaching with The Fampreneurs. You will attend a bi-weekly live virtual training and a full question and answer session with The Fampreneurs.

Section 10. Refund and Cancellation Policies

The Fampreneurs clearly state that there are no refunds and all sales are final for education training in The Family Vault Program.

Section 11. Chargebacks

You acknowledge and agree to all charges associated with this program and you will not initiate a chargeback or violate the agreement, in doing so, we will pursue legal action as it constitutes fraud.

By their signatures below, the parties hereby understand and agree to all terms and conditions of this agreement.`

const TFBA_AGREEMENT = `Program Services Agreement

Thank you for choosing The Fampreneurs to advise and implement how to start a family business by showing you how to leverage family credit, trusts, and legacy. We are excited to work with you to start and grow your family business.

This Agreement is entered into on this date ______________________________, by and between _________________________________ ("Mentee"), residing at ____________________________________________________________________________, and VNCI, LLC ("The Fampreneurs").

The Mentee and "The Fampreneurs's team agree as follows:

Note to Mentees: One of the most difficult aspects of successfully growing a business is making sure you keep your proprietary information and intellectual property protected, while simultaneously balancing your culture, authenticity, and commitment to Mentees. The Fampreneurs' Mastermind Program works to provide the best possible experience for all our Mentees and the following agreement outlines some parameters and terms of the Program so that each party clearly understands any and all boundaries to secure a strong business relationship and provide the best possible experience to one another.

To gain the most benefit from The Fampreneurs' Mentorship program you agree to the following:

Section 1. Program Guidelines and Payment Details

Program: The Family Business Accelerator Program.

Program Details:

The program will include:

3-months of Weekly Group Coaching with The Fampreneurs Elite team of coaches and experts (Accountability and Trust Coaching Calls)

3-months of Monthly 1-on-1 meetings with our Family Success Coach

FREE Private Access to 'The Fampreneurs Community'

Access to our In-House Trust Software where we design your personalized Private Family Trust, Unincorporated Business Trust, and 508(c)(1)(a) Faith-Based Organizational Trust for your family business.

You will have FREE access to our Monthly Coaching Calls with "The Fampreneurs" 6 & 7-Figure Friends

FOR CLIENTS UNDER 680 credit score - We offer access to our AI-powered credit disputing software and/or our done-for-you credit restoration service for 120-days ONLY, which leverages Consumer Law and Metro 2 Compliance standards to assist in repairing and improving your credit profile.

FOR CLIENTS OVER 680 credit score - We provide a done-for-you credit stacking assessment designed to strategically position you to obtain up to $25,000 in credit funding under the entity of your choosing. A standard administrative fee of ten percent (10%) shall be assessed on the total amount of credit funding secured on your behalf.

Payment Terms:

Total Program Cost: The Family Business Accelerator - Regularly $9,000, but today for ONLY $7,500.

Reduced sums may be offered as part of the promotions from time to time in which case the compensation will be altered to reflect the promotional price.

If you are enrolling under a payment plan, the total investment is Nine Thousand Dollars ($9,000.00). An initial deposit of Three Thousand Dollars ($3,000.00) is required to secure your enrollment, followed by two (2) consecutive monthly payments of Three Thousand Dollars ($3,000.00) each.

All payments are non refundable. The sign-up start time is considered to be at the time of signing this document. All sales are non-refundable and chargebacks are not allowed. All non-payment will result in a filing with UCC as a lien.

Section 2. Terms of Participation

Our goal at The Fampreneurs' Mentorship and within the program is to provide the best possible experience for all program participants and subscribers. Due to this fact, The Fampreneurs' Mentorship program holds the right to limit, suspend, and/or terminate your subscription and participation at any point in any of the programs offered by The Fampreneurs' Mentorship program due to you:

Becoming disruptive or overly difficult to work with, hindering the productivity and/or participation of any The Fampreneurs' Mentorship program employee, subscriber, customer, Mentee, or instructor.

Section 3. Non-Solicitation

We at The Fampreneurs' Mentorship program take the protection of our proprietary information and intellectual property very seriously. For this reason and the benefit of The Fampreneurs' Mentorship program, you agree that during and following the completion of your membership in the program (6-month mark from the signup date) you will not directly or indirectly solicit any person, Mentee, or employee of The Fampreneurs' Mentorship program to compete with The Fampreneurs' Mentorship program or provide similar services like The Fampreneurs' Mentorship program for the term of 12 months (1 year). (18 months from the start date of the program)

Section 4. Content Sharing

The Fampreneurs' Mentorship program will respect your and your fellow members' privacy. In return, The Fampreneurs' Mentorship program expects you to respect fellow Program members' privacy. Confidential information shared is The Fampreneurs' Mentorship program's property and/or the member who discloses the information.

Recorded content is not to be shared at any time with anyone outside of the program. All materials, content, recordings, writings, and directions are always confidential and kept private. Failure to abide by this guideline is subject to immediate removal from the program with no refund of any kind.

Any reproduction or resale of the content within The Fampreneurs' Mentorship program is strictly prohibited.

Section 5. Terms of Service

You irrevocably agree that signing up and paying (the "Company" or "we/us") is accepting you as The Fampreneurs' Mentorship program (the "Program") participant. The Fampreneurs' Mentorship Program Participant Agreement (the "Agreement") automatically becomes a binding contract between you and the Company and applies to your participation in the program.

By signing this agreement, you acknowledge that you have read, agree to, and accept all of the terms and conditions in this Agreement.

By filling in your credit/debit card information and submitting it, you authorize the Company to charge your credit or debit cards indicated above as payment for your membership in the Program. To further clarify, after you sign this agreement, you agree that no refunds will be issued, and all monthly payments (if applicable) must be paid on a timely basis regardless of your participation or results.

We are committed to providing all Program participants with a positive Program experience.

The Fampreneurs FAQs:

General Overview: The following features are included within your The Fampreneurs' Mentorship Membership: (1) Coaching calls and The Fampreneurs' Mentorship community

"When does my year in the mastermind start?"
It starts on the exact date that you joined The Fampreneurs' Mentorship and lasts for 90 days from that point onwards.

Section 6. Program Content and Direction

Program content is based on investment experiences and is always evolving/changing. The program is meant for a general audience. It is not construed as investment advice or financial direction on any specific business or transaction about investing or otherwise.

The information contained within The Fampreneurs' Mentorship program is strictly for educational purposes. Program content is for individual member use only.

Section 7. Right to Use Name and Likeness

You hereby consent to the use of your name, photograph, likeness, voice, testimonial, and biographical material, in whole or in part, for publication or reproduction in any medium, including but not limited to television, radio, print media, and the internet.

Section 8. Terms of Sale

You hereby agree that all Program sales are final, non-refundable, and non-transferable.

You agree to make all payments on time and in full, as outlined in Section 1.

You agree to waive any/all rights to charge-back, dispute, or make claims against any payment made to The Legatum Group, LLC.

Section 9. The Fampreneurs' Mentorship program includes

Coaching with The Fampreneurs. You will attend a bi-weekly live virtual training and a full question and answer session with The Fampreneurs.

Section 10. Refund and Cancellation Policies

The Fampreneurs clearly state that there are no refunds and all sales are final for education training in The Family Business Accelerator Program.

Section 11. Chargebacks

You acknowledge and agree to all charges associated with this program and you will not initiate a chargeback or violate the agreement, in doing so, we will pursue legal action as it constitutes fraud.

By their signatures below, the parties hereby understand and agree to all terms and conditions of this agreement.`

const TFFM_AGREEMENT = `Program Services Agreement

Thank you for choosing The Fampreneurs to advise and implement how to start a family business by showing you how to leverage family credit, trusts, and legacy. We are excited to work with you to start and grow your family business.

This Agreement is entered into on this date ______________________________, by and between _________________________________ ("Mentee"), residing at ____________________________________________________________________________, and VNCI, LLC ("The Fampreneurs").

The Mentee and "The Fampreneurs's team agree as follows:

Note to Mentees: One of the most difficult aspects of successfully growing a business is making sure you keep your proprietary information and intellectual property protected, while simultaneously balancing your culture, authenticity, and commitment to Mentees. The Fampreneurs' Mastermind Program works to provide the best possible experience for all our Mentees and the following agreement outlines some parameters and terms of the Program so that each party clearly understands any and all boundaries to secure a strong business relationship and provide the best possible experience to one another.

To gain the most benefit from The Fampreneurs' Mentorship program you agree to the following:

Section 1. Program Guidelines and Payment Details

Program: The Family Fortune Mastermind.

Program Details:

The mastermind will include:

12-months of Bi-weekly Group Mastermind Session Calls with The Fampreneurs Elite team of coaches and experts

12-months of Monthly 1-on-1 meetings with our Family Success Coach

FREE Private Access to 'The Family Fortune Mastermind' Skool Community

One (1) Offshore Trust selected from our Global Partners Portfolio, subject to full program payment and the client's responsibility to satisfy any additional setup fees, required minimum deposits, ongoing banking requirements, or other conditions imposed by the trustee, private bank, or financial institution associated with the selected jurisdiction.

You will have FREE access to our:

Monthly Group Mastermind Session Calls with "The Fampreneurs" 6 & 7-Figure Friends

(1) Yearly In-Person International 4-Day Mastermind Event (You are responsible for travel airfare, but we will pay for the lodging, excursions, and only the drive to & back from the airport & pre-excursions)

Meals Provided:

Day 1: Welcome mixer with light hors d'oeuvres
Day 2: Breakfast and lunch (dinner on your own)
Day 3: Breakfast and lunch (dinner on your own)
Day 4: Breakfast, lunch, and dinner

You may bring one guest only. One additional guest may attend for $3,500, which covers lodging, excursions, meals provided and explained above, and transportation.

Payment Terms:

Total Program Cost: The Family Fortune Mastermind - Regularly $42,000, but today for ONLY $35,000.

Reduced sums may be offered as part of the promotions from time to time in which case the compensation will be altered to reflect the promotional price.

If you are enrolling under a payment plan, the total investment is Forty-Two Thousand Dollars ($42,000.00). An initial deposit of Three Thousand Five Hundred Dollars ($3,500.00) is required to secure your enrollment, followed by eleven (11) consecutive monthly payments of Three Thousand Five Hundred Dollars ($3,500.00) each.

Please note the following payment requirements:

Offshore trust setup is only initiated once the program is paid in full.

Participants must be current on all payments to maintain access to program deliverables and to attend international, in-person masterminds.

For members on a payment plan:

After Payment 1 of the 12-month installment plan, the mentee will receive access to the private community video course deliverables.

If any payment from Payment 2 through Payment 12 is not received within 30 days, plus a 5-day grace period, and no written notice of hardship is provided, access to all program deliverables and software will be suspended until the account is brought current.

Payment may be made via wire transfer. Wire transfer information will be provided by The Fampreneurs' Mentorship program at the time of sign-up.

All payments are non refundable. The sign-up start time is considered to be at the time of signing this document. All sales are non-refundable and chargebacks are not allowed. All non-payment will result in a filing with UCC as a lien.

The "Mentee" may determine which payment method is preferred, and the "Mentee" is responsible for informing "The Fampreneurs" of this preference at least five (5) business days before the payment due date since The Fampreneurs' Mentorship program's payment system may automatically charge one of the cards on file that may not be the "Mentee's" preferred payment method.

Section 2. Terms of Participation

Our goal at The Fampreneurs' Mentorship and within the program is to provide the best possible experience for all program participants and subscribers. Due to this fact, The Fampreneurs' Mentorship program holds the right to limit, suspend, and/or terminate your subscription and participation at any point in any of the programs offered by The Fampreneurs' Mentorship program due to you:

Becoming disruptive or overly difficult to work with, hindering the productivity and/or participation of any The Fampreneurs' Mentorship program employee, subscriber, customer, Mentee, or instructor. Failure to follow The Fampreneurs' Mentorship program guidelines as laid out in this agreement.

Section 3. Non-Solicitation

We at The Fampreneurs' Mentorship program take the protection of our proprietary information and intellectual property very seriously. For this reason and the benefit of The Fampreneurs' Mentorship program, you agree that during and following the completion of your membership in the program (6-month mark from the signup date) you will not directly or indirectly solicit any person, Mentee, or employee of The Fampreneurs' Mentorship program to compete with The Fampreneurs' Mentorship program or provide similar services like The Fampreneurs' Mentorship program for the term of 12 months (1 year). (18 months from the start date of the program)

You may not act individually or as a business/entity/consultant to compete or provide similar services like The Fampreneurs' Mentorship program for the terms explained above (18 months from the start date of The Fampreneurs' Mentorship program)

Section 4. Content Sharing

The Fampreneurs' Mentorship program will respect your and your fellow members' privacy. In return, The Fampreneurs' Mentorship program expects you to respect fellow Program members' privacy and The Fampreneurs' Mentorship program subscription members. Alongside this, you agree to not infringe upon The Fampreneurs' Mentorship program or fellow members' rights, trademarks, logos, designs, programs, and/or businesses without prior written consent.

Confidential information shared by The Fampreneurs' Mentorship Mastermind program or fellow program members is The Fampreneurs' Mentorship program's property and/or the member who discloses the information.

Recorded content is not to be shared at any time with anyone outside of the program. All materials, content, recordings, writings, and directions are always confidential and kept private. Failure to abide by this guideline is subject to immediate removal from the program with no refund of any kind.

Any reproduction or resale of the content within The Fampreneurs' Mentorship program is strictly prohibited.

Section 5. Terms of Service

You irrevocably agree that signing up and paying (the "Company" or "we/us") is accepting you as The Fampreneurs' Mentorship program (the "Program") participant. The Fampreneurs' Mentorship Program Participant Agreement (the "Agreement") automatically becomes a binding contract between you and the Company and applies to your participation in the program.

By signing this agreement, you acknowledge that you have read, agree to, and accept all of the terms and conditions in this Agreement. We may amend this Agreement at any time by sending you a revised version at the address you provide us.

By filling in your credit/debit card information and submitting it, you authorize the Company to charge your credit or debit cards indicated above as payment for your membership in the Program. To further clarify, after you sign this agreement, you agree that no refunds will be issued, and all monthly payments (if applicable) must be paid on a timely basis regardless of your participation or results.

We are committed to providing all Program participants with a positive Program experience. By signing this agreement, you agree that the Company may, at its sole discretion, terminate this agreement, and limit, suspend, or terminate your participation in the Program without a refund or forgiveness of the remaining monthly payments if you become disruptive or difficult to work with, if you fail to follow the Program guidelines, or if you impair the participation of Program instructors or participants in the Program. We respect your privacy and, as such, must insist that you respect the privacy of fellow Program participants.

By signing this agreement, you agree not to violate the publicity or privacy rights of any Program participant. We respect your confidential and proprietary information, ideas, plans, and trade secrets (collectively, "Confidential Information"). We must insist that you respect the same rights as fellow Program participants and the Company. By signature you "agree" above, you agree (1) not to infringe on any Program participants of the Company's copyright, patent, trademark, trade secret, or another intellectual property right, (2) that any confidential information shared by Program participants or any representative of the company is confidential and proprietary, and belongs solely and exclusively to the Participant who discloses it or the Company, (3) you agree not to disclose such information to any other person or use it in any manner other than in discussion with the other Program participants during Program sessions. By Signing, you further agree that (4) all materials and information provided to you by the Company may only be used by you as authorized by the Company, and (5) the reproduction, distribution, and sales of these materials by anyone is strictly prohibited. Further, by signing, you agree that, if you violate or display any likelihood of violating, any of your agreements contained in this paragraph, the Company and/or the other Program participant(s) will be entitled to injunctive relief to prohibit any such violations from protecting against the harm of such violations.

The Fampreneurs FAQs:

Note: Please read the following FAQs thoroughly to better understand what to expect with The Fampreneurs' Mentorship program features and benefits.

General Overview: The following features are included within your The Fampreneurs' Mentorship Membership: (1) Coaching calls and The Fampreneurs' Mentorship community

Coaching calls - The schedule of calls below occurs on either a monthly or weekly basis. It is highly recommended upon joining The Fampreneurs' Mentorship to attend as many coaching calls as possible. Members are responsible for attending and addressing any questions they may have related to the call subject matter. Call duration is normally between 30 minutes to 2 hours each. Please note: These calls, dates and times are subject to change.

Section 6. Program Content and Direction

Program content is based on investment experiences and is always evolving/changing. The program is meant for a general audience. It is not construed as investment advice or financial direction on any specific business or transaction about investing or otherwise. The content within The Fampreneurs' Mentorship program is focused on the principles of gaining capital to fund your investments.

The information contained within The Fampreneurs' Mentorship program is strictly for educational purposes. Program content is for individual member use only. You understand that without taking proper action on the course material that you will receive zero results. You understand that your success in this program, in general, is largely based on taking consistent action. The Fampreneurs' Mentorship program cannot build and run your business for you.

Section 7. Right to Use Name and Likeness

You hereby consent to the use of your name, photograph, likeness, voice, testimonial, and biographical material, in whole or in part, for publication or reproduction in any medium, including but not limited to television, radio, print media, and the internet, among others, for any purposes including but not limited to public relations, education, advertising, marketing, training, and research.

Your consent is granted to The Fampreneurs' Mentorship program and extends to such use without restriction or limitation regarding time or geographic boundary.

Section 8. Terms of Sale

You hereby agree that all Program sales are final, non-refundable, and non-transferable.

You agree to make all payments on time and in full, as outlined in Section 1. You agree that all payments must be made on time as outlined in Section 1, and if payments are not made on time, The Legatum Group, LLC., program reserves the right to remove you from the Program.

You agree to waive any/all rights to charge-back, dispute, or make claims ("disputes") against any payment made to The Legatum Group, LLC., program as being fraudulent, purchased in error, services not delivered to you, product not received, or any other dispute which claims that any payment is unlawful.

Section 9. The Fampreneurs' Mentorship program includes

Coaching with The Fampreneurs. You will attend a bi-weekly live virtual training and a full question and answer session with The Fampreneurs.

Section 10. Refund and Cancellation Policies

The Fampreneurs clearly state that there are no refunds and all sales are final for education training in The Family Fortune Mastermind Program.

I understand that the training program teaches me everything I need to do from A-Z. If I'm stuck anywhere, I will ask for help in the Private Community Group and on the LIVE Q&A Calls.

Section 11. Chargebacks

You acknowledge and agree to all charges associated with this program and you will not initiate a chargeback or violate the agreement, in doing so, we will pursue legal action as it constitutes fraud.

By their signatures below, the parties hereby understand and agree to all terms and conditions of this agreement.`

const AGREEMENT_MAP: Record<string, string> = {
  'The Family Vault': TFV_AGREEMENT,
  'The Family Business Accelerator': TFBA_AGREEMENT,
  'The Family Fortune Mastermind': TFFM_AGREEMENT,
}

// Map profile program_name values to agreement keys
function getAgreementKey(programName: string | null | undefined): string | null {
  if (!programName) return null
  const normalizedProgramName = programName.trim().toLowerCase()

  if (
    normalizedProgramName === 'tfv' ||
    normalizedProgramName.includes('vault')
  ) {
    return 'The Family Vault'
  }

  if (
    normalizedProgramName === 'tfba' ||
    normalizedProgramName.includes('accelerator')
  ) {
    return 'The Family Business Accelerator'
  }

  if (
    normalizedProgramName === 'tffm' ||
    normalizedProgramName.includes('mastermind') ||
    normalizedProgramName.includes('fortune')
  ) {
    return 'The Family Fortune Mastermind'
  }

  return null
}

export default function ProgramAgreement() {
  const { user, profile, loading: authLoading } = useAuth()
  const { isAdminOrOwner, isLoading: roleLoading } = useIsAdminOrOwner()
  const {
    signed: agreementSigned,
    loading: agreementLoading,
    needsAgreement,
    verificationCompleted,
    completed: agreementCompleted,
  } = useAgreementStatus()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [signature, setSignature] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [useTypedSignature, setUseTypedSignature] = useState(true)
  
  // Post-signing verification states
  const [agreementStep, setAgreementStep] = useState<'signing' | 'verification'>('signing')
  const [humanVerified, setHumanVerified] = useState(false)
  const [idUploading, setIdUploading] = useState(false)
  const [idUploaded, setIdUploaded] = useState(false)
  const [idFileName, setIdFileName] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [codeVerified, setCodeVerified] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Generate Sign ID
  const signId = user ? `SID-${user.id.slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}` : ''

  const programName = profile?.program_name
  const agreementKey = getAgreementKey(programName)
  const agreementText = agreementKey ? AGREEMENT_MAP[agreementKey] : null

  // Owners/admins bypass agreement
  useEffect(() => {
    if (!authLoading && !roleLoading && isAdminOrOwner) {
      navigate('/dashboard')
    }
  }, [authLoading, roleLoading, isAdminOrOwner, navigate])

  // If agreement is fully completed, skip to profile photo (or community)
  useEffect(() => {
    if (needsAgreement && agreementSigned && !verificationCompleted) {
      setAgreementStep('verification')
      return
    }

    if (agreementStep === 'verification') return // Don't redirect during verification
    if (!authLoading && !roleLoading && !agreementLoading && user && !isAdminOrOwner && profile) {
      if (!needsAgreement || agreementCompleted) {
        // Agreement done or not needed — go to profile photo if needed, else community
        if (!profile.profile_photo_uploaded) {
          navigate('/profile-photo')
        } else {
          window.location.href = '/community'
        }
      }
    }
  }, [authLoading, roleLoading, agreementLoading, user, isAdminOrOwner, profile, needsAgreement, agreementSigned, verificationCompleted, agreementCompleted, navigate, agreementStep])

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ')
  const address = profile?.mailing_address || [
    (profile as any)?.street_address,
    (profile as any)?.city,
    (profile as any)?.state,
    (profile as any)?.zip_code
  ].filter(Boolean).join(', ')
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [useTypedSignature])

  // If no agreement needed for this program, redirect to community
  useEffect(() => {
    if (!authLoading && !roleLoading && !isAdminOrOwner && profile && !agreementText) {
      navigate('/community')
    }
  }, [agreementText, authLoading, roleLoading, isAdminOrOwner, profile, navigate])

  // Loading state
  if (authLoading || roleLoading || agreementLoading || (!!user && !isAdminOrOwner && !profile)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    )
  }

  if (isAdminOrOwner) return null
  if (!needsAgreement || agreementCompleted) return null
  if (!agreementText) return null

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.beginPath()
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
    setIsDrawing(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
    ctx.stroke()
    setHasDrawn(true)
  }

  const stopDrawing = () => setIsDrawing(false)

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const handleSubmit = async () => {
    if (!user || !agreementKey) return

    const signatureData = useTypedSignature
      ? signature.trim()
      : canvasRef.current?.toDataURL() || ''

    if (!signatureData || (useTypedSignature && !signature.trim()) || (!useTypedSignature && !hasDrawn)) {
      toast({ title: 'Signature required', description: 'Please sign the agreement before submitting.', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('program_agreements').insert({
        user_id: user.id,
        program_name: agreementKey,
        full_name: fullName,
        mailing_address: address || 'Not provided',
        agreement_date: new Date().toISOString().split('T')[0],
        signature_data: signatureData,
      })
      if (error) throw error

      // Send signed agreement copy via email
      try {
        await supabase.functions.invoke('send-agreement-email', {
          body: {
            agreementId: user.id,
            recipientEmail: user.email,
            fullName,
            programName: agreementKey,
            agreementDate: new Date().toISOString().split('T')[0],
            mailingAddress: address || 'Not provided',
            signatureData,
          },
        })
      } catch (emailErr) {
        console.error('Failed to send agreement email:', emailErr)
      }

      toast({ title: 'Agreement signed!', description: 'Please complete the verification process.' })
      setAgreementStep('verification')
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to save agreement.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleIdUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    
    setIdUploading(true)
    try {
      const filePath = `${user.id}/id-verification/${Date.now()}-${file.name}`
      const { error } = await supabase.storage
        .from('documents')
        .upload(filePath, file)
      
      if (error) throw error
      setIdUploaded(true)
      setIdFileName(file.name)
      toast({ title: 'ID Uploaded', description: 'Your identification has been uploaded for verification.' })
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message || 'Failed to upload ID.', variant: 'destructive' })
    } finally {
      setIdUploading(false)
    }
  }

  const handleSendVerificationCode = async () => {
    if (!user?.email) return
    setSendingCode(true)
    try {
      const { error } = await supabase.functions.invoke('send-email-verification', {
        body: { email: user.email }
      })
      if (error) throw error
      setCodeSent(true)
      toast({ title: 'Code Sent', description: `A verification code has been sent to ${user.email}` })
    } catch (err: any) {
      toast({ title: 'Error', description: 'Failed to send verification code.', variant: 'destructive' })
    } finally {
      setSendingCode(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) return
    setVerifyingCode(true)
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { email: user?.email, code: verificationCode, method: 'email' }
      })
      if (error) throw error
      if (data?.success || data?.verified) {
        setCodeVerified(true)
        toast({ title: 'Verified!', description: 'Your identity has been verified. Redirecting...' })
        setTimeout(() => {
          window.location.href = '/profile-photo'
        }, 1500)
      } else {
        toast({ title: 'Invalid Code', description: 'Please check your code and try again.', variant: 'destructive' })
      }
    } catch (err: any) {
      toast({ title: 'Error', description: 'Verification failed. Please try again.', variant: 'destructive' })
    } finally {
      setVerifyingCode(false)
    }
  }

  if (agreementStep === 'verification') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs" className="w-12 h-12 mx-auto mb-2 object-contain" />
            <CardTitle className="text-xl">Identity Verification</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Complete these steps to verify your agreement</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Human Verification */}
            <div className={`p-4 rounded-lg border ${humanVerified ? 'border-green-300 bg-green-50' : 'border-border'}`}>
              <div className="flex items-center gap-3">
                {humanVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Shield className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Verify You Are Human</h3>
                  <p className="text-xs text-muted-foreground mt-1">Confirm that you are a real person signing this agreement</p>
                </div>
              </div>
              {!humanVerified && (
                <div className="mt-3 flex items-center gap-2">
                  <Checkbox
                    id="human-verify"
                    onCheckedChange={(checked) => setHumanVerified(!!checked)}
                  />
                  <label htmlFor="human-verify" className="text-sm cursor-pointer">
                    I confirm that I am a real person and I have read and signed this agreement
                  </label>
                </div>
              )}
            </div>

            {/* Step 2: ID Upload */}
            <div className={`p-4 rounded-lg border ${idUploaded ? 'border-green-300 bg-green-50' : humanVerified ? 'border-border' : 'border-border opacity-50'}`}>
              <div className="flex items-center gap-3">
                {idUploaded ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Upload Driver's License / ID</h3>
                  <p className="text-xs text-muted-foreground mt-1">Upload a photo of your government-issued ID to verify your identity</p>
                </div>
              </div>
              {humanVerified && !idUploaded && (
                <div className="mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleIdUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={idUploading}
                    style={{ backgroundColor: '#ffb500', color: '#290a52', transition: 'background-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2eb2ff')}
                    onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffb500')}
                  >
                    {idUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Uploading...</> : <><Upload className="h-4 w-4 mr-2" /> Choose File</>}
                  </Button>
                </div>
              )}
              {idUploaded && (
                <p className="text-xs text-green-600 mt-2">✓ {idFileName} uploaded</p>
              )}
            </div>

            {/* Step 3: Email Verification */}
            <div className={`p-4 rounded-lg border ${codeVerified ? 'border-green-300 bg-green-50' : idUploaded ? 'border-border' : 'border-border opacity-50'}`}>
              <div className="flex items-center gap-3">
                {codeVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                ) : (
                  <Mail className="h-5 w-5 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-sm">Email Verification</h3>
                  <p className="text-xs text-muted-foreground mt-1">We'll send a verification code to {user?.email}</p>
                </div>
              </div>
              {idUploaded && !codeVerified && (
                <div className="mt-3 space-y-3">
                  {!codeSent ? (
                    <Button
                      size="sm"
                      onClick={handleSendVerificationCode}
                      disabled={sendingCode}
                      style={{ backgroundColor: '#ffb500', color: '#290a52', transition: 'background-color 0.2s' }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2eb2ff')}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffb500')}
                    >
                      {sendingCode ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</> : <><Mail className="h-4 w-4 mr-2" /> Send Verification Code</>}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter 6-digit code"
                        value={verificationCode}
                        onChange={e => setVerificationCode(e.target.value)}
                        maxLength={6}
                        className="w-40"
                      />
                      <Button
                        size="sm"
                        onClick={handleVerifyCode}
                        disabled={verifyingCode || !verificationCode.trim()}
                        style={{ backgroundColor: '#ffb500', color: '#290a52', transition: 'background-color 0.2s' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#2eb2ff')}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ffb500')}
                      >
                        {verifyingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-5xl flex gap-6">
        {/* Main Agreement Card */}
        <Card className="flex-1">
          <CardHeader className="text-center">
            <img src="/lovable-uploads/f9de210b-406b-4d7d-9a44-c0e6e5114825.png" alt="TruHeirs" className="w-12 h-12 mx-auto mb-2 object-contain" />
            <CardTitle className="text-2xl">Program Services Agreement</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{agreementKey}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Auto-filled info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50 border">
              <div>
                <Label className="text-xs text-muted-foreground">Date</Label>
                <p className="text-sm font-medium">{today}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Mentee Name</Label>
                <p className="text-sm font-medium">{fullName || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Address</Label>
                <p className="text-sm font-medium">{address || 'Not set'}</p>
              </div>
            </div>

            {/* Agreement text */}
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {agreementText}
              </div>
            </ScrollArea>

            {/* Signature section */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Your Signature</h3>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={useTypedSignature ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseTypedSignature(true)}
                  >
                    Type
                  </Button>
                  <Button
                    type="button"
                    variant={!useTypedSignature ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUseTypedSignature(false)}
                  >
                    Draw
                  </Button>
                </div>
              </div>

              {useTypedSignature ? (
                <div className="space-y-2">
                  <Label>Type your full legal name as your signature</Label>
                  <Input
                    value={signature}
                    onChange={e => setSignature(e.target.value)}
                    placeholder="Your full legal name"
                    className="text-lg italic font-serif"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Draw your signature below</Label>
                  <div className="border rounded-lg bg-white relative">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={150}
                      className="w-full cursor-crosshair"
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={clearCanvas}>
                    Clear
                  </Button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Mentee's Printed Name</Label>
                  <p className="text-sm font-medium border-b pb-1">{fullName}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Date</Label>
                  <p className="text-sm font-medium border-b pb-1">{today}</p>
                </div>
              </div>

              {/* Sign ID */}
              <div className="mt-3 p-3 rounded-lg bg-muted/50 border flex items-center gap-3">
                <PenTool className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <Label className="text-xs text-muted-foreground">Sign ID</Label>
                  <p className="text-xs font-mono font-medium">{signId}</p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || (useTypedSignature ? !signature.trim() : !hasDrawn)}
              className="w-full"
              style={{ backgroundColor: '#ffb500', color: '#290a52' }}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4 mr-2" /> Sign Agreement & Continue</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Activity Timeline Sidebar - Desktop Only */}
        <div className="hidden lg:block w-64 shrink-0">
          <Card className="sticky top-8">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div className="w-px h-full bg-border mt-1" />
                </div>
                <div>
                  <p className="text-xs font-medium">Agreement Opened</p>
                  <p className="text-[10px] text-muted-foreground">{today}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                    <Eye className="h-3.5 w-3.5 text-green-600" />
                  </div>
                  <div className="w-px h-full bg-border mt-1" />
                </div>
                <div>
                  <p className="text-xs font-medium">Agreement Reviewed</p>
                  <p className="text-[10px] text-muted-foreground">In progress</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`h-6 w-6 rounded-full ${(useTypedSignature ? signature.trim() : hasDrawn) ? 'bg-green-100' : 'bg-muted'} flex items-center justify-center`}>
                    <PenTool className={`h-3.5 w-3.5 ${(useTypedSignature ? signature.trim() : hasDrawn) ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="w-px h-full bg-border mt-1" />
                </div>
                <div>
                  <p className="text-xs font-medium">Signature</p>
                  <p className="text-[10px] text-muted-foreground">
                    {(useTypedSignature ? signature.trim() : hasDrawn) ? 'Signed' : 'Pending'}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <FileCheck className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium">Verification</p>
                  <p className="text-[10px] text-muted-foreground">After signing</p>
                </div>
              </div>

              {/* Sign ID in sidebar */}
              <div className="pt-3 border-t">
                <Label className="text-[10px] text-muted-foreground">Document Sign ID</Label>
                <p className="text-[11px] font-mono font-medium mt-0.5">{signId}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
